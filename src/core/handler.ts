import "./config.js";
import fs from 'fs';
import path from 'path';
import chalk from "chalk";
import crypto from "crypto";
import fetch from 'node-fetch';
import {logCommand, logDebug, logError, logInfo, logWarn} from "../lib/logger.js";
import {smsg} from "../lib/simple.js";
import {parseMessage} from './message-parser.js';
import {buildContext, groupMetaCache} from './context-builder.js';
import {router} from './router.js';
import {runGuards} from '../guards/index.js';
import {cleanJid, isUserJid, jidToPhone, resolveSenderInfo} from '../utils/jid.js';
import {resolveMention} from '../utils/mention.js';
import {isBlockedPhoneNumber, MESSAGE_DEDUP_TTL} from '../utils/constants.js';
import {deleteMessageCount, incrementMessageCount, markBotLeftGroup, upsertActiveChat} from '../services/chat.service.js';
import {upsertUser as upsertUserService} from '../services/user.service.js';
import {incrementCommandUsage} from '../services/stats.service.js';
import {getSubbotConfig} from '../services/subbot.service.js';
import {getGroupSettings} from '../services/group-settings.service.js';
import {ENV} from './env.js';
import type {ExtendedConn} from '../types/context.js';
import type {BotMessage} from '../types/message.js';
import type {GroupMetadata, GroupParticipant, WASocket} from '@whiskeysockets/baileys';
import type {HandlerContext} from './context-builder.js';

type ParticipantUpdateItem = string | {
    id?: string;
    phoneNumber?: string;
};

interface GroupParticipantsUpdate {
    id: string;
    participants: ParticipantUpdateItem[];
    action: string;
    author?: string | {id?: string} | null;
}

interface GroupUpdate {
    id: string;
    subject?: string;
    desc?: string;
    picture?: string;
}

interface CallUpdate {
    from: string;
}

type EventConn = WASocket & {
    groupCache?: ExtendedConn['groupCache'];
};

const processedMessages = new Set<string>();

/** Imagen por defecto para welcome/bye cuando el usuario no tiene foto de perfil.
 *  Path dinámico: se resuelve relativo al cwd, así funciona también en producción. */
const DEFAULT_PP_PATH = path.join(process.cwd(), 'media', 'Menu1.jpg');

/** Lee la imagen por defecto como Buffer. Retorna null si el archivo no existe. */
function getDefaultPpBuffer(): Buffer | null {
    try {
        return fs.readFileSync(DEFAULT_PP_PATH);
    } catch {
        return null;
    }
}

/** Carpeta con los textos de welcome/bye. Path dinámico relativo al cwd (sirve en producción). */
const TEXT_DIR = path.join(process.cwd(), 'media', 'text');

/** Lee un archivo de texto de media/text/; usa el fallback si no existe o está vacío. */
function readTextFile(fileName: string, fallback: string): string {
    try {
        const txt = fs.readFileSync(path.join(TEXT_DIR, fileName), 'utf-8').trim();
        if (txt) return txt;
    } catch {
        // archivo ausente o ilegible → se usa el fallback
    }
    return fallback;
}

/** Texto de bienvenida (media/text/welcome.txt). */
function getWelcomeText(): string {
    return readTextFile('welcome.txt', 'HOLAA!! @user, ¡Bienvenido a *@group*! 🎉');
}

/** Texto de despedida (media/text/bye.txt). */
function getByeText(): string {
    return readTextFile('bye.txt', 'Bueno, se fue @user 👋\n\nQue dios lo bendiga 😎');
}

/** Elige un elemento aleatorio de un array (sin depender de Array.prototype.getRandom). */
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function uniqueJids(jids: Array<string | null | undefined>): string[] {
    return [...new Set(jids.filter((jid): jid is string => !!jid && jid.includes('@')))];
}

function getGroupMentionJids(participants: GroupParticipant[]): string[] {
    return uniqueJids(participants.map((participant) => {
        const withPhone = participant as GroupParticipant & {phoneNumber?: string};
        return withPhone.phoneNumber || participant.id;
    }));
}

async function downloadImageBuffer(url: string | null): Promise<Buffer | null> {
    if (!url) return null;
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return Buffer.from(await response.arrayBuffer());
    } catch {
        return null;
    }
}

async function getProfilePictureUrl(conn: EventConn, jid: string): Promise<string | null> {
    try {
        return await conn.profilePictureUrl(jid, 'image') || null;
    } catch {
        return null;
    }
}

async function getParticipantImageBuffer(conn: EventConn, participantJid: string, userJid: string): Promise<Buffer | null> {
    const participantUrl = await getProfilePictureUrl(conn, participantJid)
        || (participantJid !== userJid ? await getProfilePictureUrl(conn, userJid) : null);
    return downloadImageBuffer(participantUrl);
}

async function getGroupImageBuffer(conn: EventConn, groupId: string): Promise<Buffer | null> {
    return downloadImageBuffer(await getProfilePictureUrl(conn, groupId));
}

async function getGroupEventImageBuffer(conn: EventConn, groupId: string, participantJid: string, userJid: string, preferGroupPhoto = false): Promise<Buffer | null> {
    const firstImage = preferGroupPhoto
        ? await getGroupImageBuffer(conn, groupId)
        : await getParticipantImageBuffer(conn, participantJid, userJid);
    if (firstImage) return firstImage;

    const secondImage = preferGroupPhoto
        ? await getParticipantImageBuffer(conn, participantJid, userJid)
        : await getGroupImageBuffer(conn, groupId);
    if (secondImage) return secondImage;

    return getDefaultPpBuffer();
}

export async function participantsUpdate(conn: EventConn, {id, participants, action, author}: GroupParticipantsUpdate) {
    try {
        if (!id || !Array.isArray(participants) || !action) {
            logDebug(chalk.yellow(`[GRUPO-EVENTO] descartado: id=${id} action=${action} participants=${JSON.stringify(participants)}`));
            return;
        }
        if (!conn?.user?.id) return;
        logDebug(chalk.cyan(`[GRUPO-EVENTO] action=${action} grupo=${id} participantes=${participants.length}`));
        // El welcome/bye/promote/demote depende sólo de los settings del grupo,
        // no del modo (public/private) del bot: si el grupo tiene welcome activado,
        // se da bienvenida sin importar cómo entró el participante.

        // Fetch fresco para incluir al nuevo participante; si falla, caer al cache.
        let metadata: GroupMetadata | null = await conn.groupMetadata(id).catch(() => null);
        if (metadata) {
            groupMetaCache.set(id, metadata);
            conn?.groupCache?.set?.(id, metadata);
        } else {
            metadata = groupMetaCache.get(id) || null;
        }
        if (!metadata) {
            logWarn(chalk.red(`❌ participantsUpdate: sin metadata para ${id}, se omite`));
            return;
        }
        const groupName = metadata.subject || "Grupo"
        const botJidClean = (conn.user?.id || "").replace(/:\d+/, "")
        const botLidClean = (conn.user?.lid || "").replace(/:\d+/, "")

        const isBotAdmin = metadata.participants.some((p) => {
            const cleanId = p.id?.replace(/:\d+/, "");
            return (
                (cleanId === botJidClean || cleanId === botLidClean) &&
                (p.admin === "admin" || p.admin === "superadmin")
            );
        });

        const settings = await getGroupSettings(id) || {
            welcome: true,
            detect: true,
            antifake: false
        }
        if (action === "add") {
            logDebug(chalk.cyan(`[WELCOME] grupo=${id} settings.welcome=${settings.welcome} (isBotAdmin=${isBotAdmin})`));
        }

        const arabicCountryCodes = ['+91', '+92', '+222', '+93', '+265', '+213', '+225', '+240', '+241', '+61', '+249', '+62', '+966', '+229', '+244', '+40', '+49', '+20', '+963', '+967', '+234', '+256', '+243', '+210', '+249', , '+212', '+971', '+974', '+968', '+965', '+962', '+961', '+964', '+970'];
        const metaParticipants = metadata.participants || [];

        // El autor puede venir como string, objeto {id,...} o null.
        const authorStr = typeof author === 'string'
            ? author
            : (author && typeof author === 'object' ? String(author.id || '') : '');

        for (const rawParticipant of participants) {
            // El evento puede traer strings (Baileys clásico) u objetos
            // { id, phoneNumber, admin } (Baileys nuevo con addressingMode 'lid').
            let participant = '';
            let phoneJid: string | null = null;
            if (typeof rawParticipant === 'string') {
                participant = rawParticipant;
            } else if (rawParticipant && typeof rawParticipant === 'object') {
                participant = String(rawParticipant.id || '');
                phoneJid = rawParticipant.phoneNumber ? String(rawParticipant.phoneNumber) : null;
            }
            if (!participant || !participant.includes('@')) continue;

            // Resolver tag/JID reales: si el evento ya trae phoneNumber lo usamos directo,
            // si no, lo buscamos en los participants del metadata.
            let userTag: string;
            let userJid: string;
            if (phoneJid && /^\d+@s\.whatsapp\.net$/.test(phoneJid)) {
                userJid = phoneJid;
                userTag = `@${phoneJid.split('@')[0]}`;
            } else {
                const resolved = resolveMention(participant, metaParticipants);
                userTag = resolved.tag;
                userJid = resolved.mentionJid;
            }

            const authorResolved = authorStr ? resolveMention(authorStr, metaParticipants) : null;
            const authorTag = authorResolved ? authorResolved.tag : "alguien";
            const authorJid = authorResolved ? authorResolved.mentionJid : authorStr;

            if (action === "add" && settings.antifake) {
                const phoneNumber = userJid.split("@")[0]
                const isFake = arabicCountryCodes.some(code => code && phoneNumber.startsWith(code.slice(1)))

                if (isFake && isBotAdmin) {
                    await conn.sendMessage(id, {
                        text: `⚠️ ${userTag} fue eliminado automáticamente por *número no permitido*`,
                        mentions: [userJid]
                    })
                    await conn.groupParticipantsUpdate(id, [participant], "remove")
                    continue
                } else if (isFake && !isBotAdmin) {
//await conn.sendMessage(id, { text: `⚠️ ${userTag} tiene un número prohibido, pero no tengo admin para eliminarlo.`, mentions: [participant] })
                    continue
                }
            }

            // Foto de perfil: promote/demote usan thumbnail por URL; welcome resuelve buffer con fallback.
            let ppUrl: string | null = null;
            if (action !== "add" && action !== "remove") {
                try {
                    ppUrl = await conn.profilePictureUrl(participant, "image") || null;
                } catch {
                    ppUrl = null;
                }
            }

            switch (action) {
                case "add":
                    if (settings.welcome) {
                        const groupDesc = metadata.desc || "*ᴜɴ ɢʀᴜᴘᴏ ɢᴇɴɪᴀ😸*\n *sɪɴ ʀᴇɢʟᴀ 😉*"
                        const raw = settings.sWelcome || getWelcomeText()
                        const msg = raw
                            .replace(/@user/gi, userTag)
                            .replace(/@group|@subject/gi, groupName)
                            .replace(/@desc/gi, groupDesc)
                        const mentionedJid = settings.welcomeHidetag
                            ? uniqueJids([...getGroupMentionJids(metaParticipants), userJid])
                            : [userJid]

                        const welcomeImage = settings.photowelcome
                            ? await getGroupEventImageBuffer(conn, id, participant, userJid, settings.welcomeGroupPhoto)
                            : null;
                        try {
                            if (welcomeImage) {
                                await conn.sendMessage(id, {
                                    image: welcomeImage,
                                    caption: msg,
                                    contextInfo: {mentionedJid}
                                })
                            } else {
                                if (settings.photowelcome) {
                                    logDebug(chalk.yellow(`[WELCOME] Sin foto de usuario, grupo ni archivo (${DEFAULT_PP_PATH}) — se envía solo texto`));
                                }
                                await conn.sendMessage(id, {
                                    text: msg,
                                    contextInfo: {mentionedJid}
                                })
                            }
                            logInfo(chalk.green(`[WELCOME] ✅ bienvenida enviada a ${userTag} en "${groupName}"`));
                        } catch (e: unknown) {
                            logError(chalk.red(`[WELCOME] ❌ falló el envío a ${userTag} en ${id}:`), e);
                        }
                    } else {
                        logDebug(chalk.yellow(`[WELCOME] omitido — welcome desactivado en "${groupName}"`));
                    }
                    break

                case "remove":
                    try {
                        await deleteMessageCount(userJid, id);
                        const botJid = (conn.user?.id || "").replace(/:\d+/, "");
                        if (participant.replace(/:\d+/, "") === botJid) {
                            await markBotLeftGroup(id, botJid);
                            logDebug(`[DEBUG] El bot fue eliminado del grupo ${id}. Marcado como 'joined = false'.`);
                        }
                    } catch (err: unknown) {
                        logError("❌ Error en 'remove':", err);
                    }

                    if (settings.welcome) {
                        const groupDesc = metadata.desc || "Sin descripción"
                        const raw = settings.sBye || getByeText()
                        const msg = raw
                            .replace(/@user/gi, userTag)
                            .replace(/@group/gi, groupName)
                            .replace(/@desc/gi, groupDesc)
                        const mentionedJid = settings.byeHidetag
                            ? uniqueJids([...getGroupMentionJids(metaParticipants), userJid])
                            : [userJid]

                        const byeImage = settings.photobye
                            ? await getGroupEventImageBuffer(conn, id, participant, userJid, settings.byeGroupPhoto)
                            : null;
                        try {
                            if (byeImage) {
                                await conn.sendMessage(id, {
                                    image: byeImage,
                                    caption: msg,
                                    contextInfo: {mentionedJid}
                                })
                            } else {
                                if (settings.photobye) {
                                    logDebug(chalk.yellow(`[BYE] Sin foto de usuario, grupo ni archivo (${DEFAULT_PP_PATH}) — se envía solo texto`));
                                }
                                await conn.sendMessage(id, {
                                    text: msg,
                                    contextInfo: {mentionedJid}
                                })
                            }
                            logInfo(chalk.green(`[BYE] 👋 despedida enviada a ${userTag} en "${groupName}"`));
                        } catch (e: unknown) {
                            logError(chalk.red(`[BYE] ❌ falló el envío a ${userJid} en ${id}:`), e);
                        }
                    } else {
                        logDebug(chalk.yellow(`[BYE] omitido — welcome desactivado en "${groupName}"`));
                    }
                    break

                case "promote":
                case "daradmin":
                case "darpoder":
                    if (settings.detect) {
                        const raw = settings.sPromote || `@user 𝘼𝙃𝙊𝙍𝘼 𝙀𝙎 𝘼𝘿𝙈𝙄𝙉 𝙀𝙉 𝙀𝙎𝙏𝙀 𝙂𝙍𝙐𝙋𝙊\n\n😼🫵𝘼𝘾𝘾𝙄𝙊𝙉 𝙍𝙀𝘼𝙇𝙄𝙕𝘼𝘿𝘼 𝙋𝙊𝙍: @author`
                        const msg = raw
                            .replace(/@user/gi, userTag)
                            .replace(/@group/gi, groupName)
                            .replace(/@desc/gi, metadata.desc || "")
                            .replace(/@author/gi, authorTag)
                        await conn.sendMessage(id, {
                            text: msg,
                            contextInfo: {
                                mentionedJid: [userJid, authorJid].filter(Boolean),
                                externalAdReply: {
                                    mediaUrl: pickRandom([info.nna, info.nna2, info.md]),
                                    mediaType: 2,
                                    showAdAttribution: false,
                                    renderLargerThumbnail: false,
                                    title: "NUEVO ADMINS 🥳",
                                    body: "Weon eres admin portante mal 😉",
                                    containsAutoReply: true,
                                    ...(ppUrl ? {thumbnailUrl: ppUrl} : {}),
                                    sourceUrl: "skyultraplus.com"
                                }
                            }
                        })
                    }
                    break

                case "demote":
                case "quitaradmin":
                case "quitarpoder":
                    if (settings.detect) {
                        const raw = settings.sDemote || `@user 𝘿𝙀𝙅𝘼 𝘿𝙀 𝙎𝙀𝙍 𝘼𝘿𝙈𝙄𝙉 𝙀𝙉 𝙀𝙎𝙏𝙀 𝙂𝙍𝙐𝙋𝙊\n\n😼🫵𝘼𝘾𝘾𝙄𝙊𝙉 𝙍𝙀𝘼𝙇𝙄𝙕𝘼𝘿𝘼 𝙋𝙊𝙍: @author`
                        const msg = raw
                            .replace(/@user/gi, userTag)
                            .replace(/@group/gi, groupName)
                            .replace(/@desc/gi, metadata.desc || "")
                            .replace(/@author/gi, authorTag)
                        await conn.sendMessage(id, {
                            text: msg,
                            contextInfo: {
                                mentionedJid: [userJid, authorJid].filter(Boolean),
                                externalAdReply: {
                                    mediaUrl: pickRandom([info.nna, info.nna2, info.md]),
                                    mediaType: 2,
                                    showAdAttribution: false,
                                    renderLargerThumbnail: false,
                                    title: "📛 UN ADMINS MENOS",
                                    body: "Jjjj Ya no eres admin 😹",
                                    containsAutoReply: true,
                                    ...(ppUrl ? {thumbnailUrl: ppUrl} : {}),
                                    sourceUrl: "skyultraplus.com"
                                }
                            }
                        })
                    }
                    break
            }
        }
    } catch (err: unknown) {
        logError(chalk.red(`❌ Error en participantsUpdate - Acción: ${action} | Grupo: ${id}`), err);
    }
}

export async function groupsUpdate(conn: EventConn, {id, subject, desc, picture}: GroupUpdate) {
    try {
        const botId = conn.user?.id;
        const botConfig = await getSubbotConfig(botId || '')
        const modo = botConfig.mode || "public";
        const botJid = conn.user?.id?.replace(/:\d+@/, "@");
        const isCreator = global.owner.map(([v]) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(botJid || '');
        const previousMetadata = groupMetaCache.get(id) || conn.groupCache?.get?.(id);

        const settings = await getGroupSettings(id) || {
            welcome: true,
            detect: true,
            antifake: false
        };

        if (modo === "private" && !isCreator) return;
        const metadata = await conn.groupMetadata(id);
        groupMetaCache.set(id, metadata);
        conn?.groupCache?.set?.(id, metadata);
        const groupName = metadata.subject || subject || previousMetadata?.subject || "Grupo";

        if (!previousMetadata) return;

        let message = "";
        if (subject && previousMetadata.subject && subject !== previousMetadata.subject) {
            message = `El nombre del grupo ha cambiado a *${groupName}*.`;
        } else if (desc && desc !== previousMetadata.desc) {
            message = `La descripción del grupo *${groupName}* ha sido actualizada, nueva descripción:\n\n${metadata.desc || "Sin descripción"}`;
        } else if (picture) {
            message = `La foto del grupo *${groupName}* ha sido actualizada.`;
        }

        if (message && settings.detect) {
            await conn.sendMessage(id, {text: message});
        }
    } catch (err: unknown) {
        logError(chalk.red("❌ Error en groupsUpdate:"), err);
    }
}

export async function callUpdate(conn: WASocket, call: CallUpdate) {
    try {
        const callerId = call.from;
        const botConfig = await getSubbotConfig(conn.user?.id || '');
        if (!botConfig.anti_call) return;
        await conn.sendMessage(callerId, {
            text: `🚫 Está prohibido hacer llamadas, serás bloqueado...`
        });
        await conn.updateBlockStatus(callerId, "block");
    } catch (err: unknown) {
        logError(chalk.red("❌ Error en callUpdate:"), err);
    }
}

export async function handler(conn: ExtendedConn, m: BotMessage) {
    const perfStart = performance.now();
    const marks: Record<string, number> = {};
    const chatId = m.key?.remoteJid || "";

    // 1. Dedup
    if (isDuplicate(m)) return;
    markPerf(marks, 'dedup', perfStart);

    // 2. Setup reply helper + smsg (enriquece m con .db, .quoted, .download, etc.)
    m.reply = async (text: string) => {
        const contextInfo = {
            mentionedJid: await conn.parseMention(text)
        };
        return await conn.sendMessage(chatId, {text, contextInfo}, {quoted: m});
    };
    await smsg(conn, m);
    markPerf(marks, 'smsg', perfStart);

    // 3. Build context (sender, permisos, metadata, config — 1 sola llamada a getSubbotConfig)
    const ctx = await buildContext(conn, m);
    if (ctx.shouldAbort) return;
    m.isAdmin = ctx.isAdmin;
    m.isBotAdmin = ctx.isBotAdmin;
    m.chatDB = ctx.groupSettings;
    markPerf(marks, 'context', perfStart);

    // 4. Upsert chat
    upsertChat(chatId, conn);

    // 5. Message counter (throttled)
    trackMessageCount(m, ctx);

    // 6. Antifake check
    if (await antifakeCheck(conn, m, ctx)) return;

    // 7. Upsert user data (fire-and-forget — m.sender/m.lid ya resueltos en buildContext)
    upsertUser(m).catch(console.error);

    // 8. Parse message (antes de before hooks para que m.originalText y m.text estén disponibles)
    const prefixes = Array.isArray(ctx.botConfig.prefix) ? ctx.botConfig.prefix : [ctx.botConfig.prefix];
    const parsed = parseMessage(m, prefixes);
    m.originalText = parsed.originalText;
    m.text = parsed.text;
    markPerf(marks, 'parse', perfStart);

    // 9. Run before hooks
    const isPrefixedCommand = !!parsed.usedPrefix && !!parsed.command;
    for (const plugin of router.getBeforePlugins()) {
        if (isPrefixedCommand && !plugin.runBeforeOnCommand) continue;
        try {
            const result = await plugin.before!(m, {conn, isOwner: ctx.isOwner});
            if (result === false) return;
        } catch (e: unknown) {
            logError(chalk.red(e));
        }
    }
    markPerf(marks, 'before', perfStart);

    // 10. Route command
    const plugin = router.resolve(parsed.command, parsed.originalText, !!parsed.usedPrefix);
    if (!plugin) {
        logPerfIfSlow(marks, perfStart, parsed.command || 'no-command', chatId);
        return;
    }

    // 11. Run guards
    const guardResult = await runGuards({m, conn, ctx, plugin});
    markPerf(marks, 'guards', perfStart);
    if (guardResult.silent) return;
    if (guardResult.error) {
        await m.reply(guardResult.error);
        markPerf(marks, 'guardReply', perfStart);
        logPerfIfSlow(marks, perfStart, parsed.command, chatId);
        return;
    }

    // 12. Execute plugin
    try {
        logCommand({
            conn,
            sender: ctx.sender,
            chatId: ctx.chatId,
            isGroup: ctx.isGroup,
            command: parsed.command,
            timestamp: new Date()
        });

        await plugin(m, {
            conn,
            text: parsed.text,
            args: parsed.args,
            usedPrefix: parsed.usedPrefix,
            command: parsed.command,
            participants: ctx.participants,
            metadata: ctx.metadata,
            isOwner: ctx.isOwner,
            isROwner: ctx.isROwner,
            isAdmin: ctx.isAdmin,
            isBotAdmin: ctx.isBotAdmin,
            isGroup: ctx.isGroup
        });

        incrementCommandUsage(parsed.command);
        markPerf(marks, 'plugin', perfStart);
        logPerfIfSlow(marks, perfStart, parsed.command, chatId);

    } catch (e: unknown) {
        if (typeof e === 'string') {
            await m.reply(e);
            return;
        }
        logError(chalk.red(`❌ Error al ejecutar ${parsed.command}: ${e}`));
        m.reply("❌ Error ejecutando el comando, reporte este error a mi creador con el comando: /report\n\n" + e);
    }
}

// ---- Helpers privados del handler ----

function markPerf(marks: Record<string, number>, label: string, start: number): void {
    marks[label] = Math.round(performance.now() - start);
}

function logPerfIfSlow(marks: Record<string, number>, start: number, command: string, chatId: string): void {
    const total = Math.round(performance.now() - start);
    if (total < ENV.PERF_LOG_THRESHOLD_MS) return;
    const chunks = Object.entries(marks).map(([key, value]) => `${key}=${value}ms`).join(' ');
    logDebug(chalk.yellow(`[PERF] total=${total}ms cmd=${command || '-'} chat=${chatId} ${chunks}`));
}

function isDuplicate(m: BotMessage): boolean {
    const hash = crypto.createHash("md5").update(m.key.id + (m.key.remoteJid || "")).digest("hex");
    if (processedMessages.has(hash)) return true;
    processedMessages.add(hash);
    setTimeout(() => processedMessages.delete(hash), MESSAGE_DEDUP_TTL);
    return false;
}

function upsertChat(chatId: string, conn: ExtendedConn): void {
    upsertActiveChat({
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        timestamp: Date.now(),
        botId: jidToPhone(cleanJid(conn.user?.id || '')),
    }).catch(console.error);
}

function trackMessageCount(m: BotMessage, ctx: {
    chatId: string;
    sender: string;
    botJid: string;
    isGroup: boolean;
    isAdmin: boolean
}): void {
    // Sólo se cuentan mensajes de integrantes normales:
    // se ignoran los chats privados, el propio bot y los administradores del grupo.
    if (!ctx.isGroup) return;
    if (ctx.sender === ctx.botJid) return;
    if (ctx.isAdmin) return;

    // Sin throttle: cada mensaje suma (conteo exacto). El INSERT es fire-and-forget.
    incrementMessageCount(ctx.sender, ctx.chatId).catch(console.error);
}

async function antifakeCheck(conn: ExtendedConn, m: BotMessage, ctx: Pick<HandlerContext, 'chatId' | 'isGroup' | 'isAdmin' | 'isBotAdmin' | 'botJid' | 'groupSettings'>): Promise<boolean> {
    if (!ctx.isGroup || !m.sender || !isUserJid(m.sender)) return false;
    // Lectura en memoria (sin query) — group_settings ya viene precargado en el ctx.
    if (!ctx.groupSettings?.antifake) return false;

    const phone = jidToPhone(m.sender);
    if (!isBlockedPhoneNumber(phone)) return false;
    if (ctx.isAdmin) return false;

    // isBotAdmin también viene precalculado en buildContext, sin necesidad de re-fetch.
    if (!ctx.isBotAdmin) return false;

    try {
        await conn.sendMessage(ctx.chatId, {
            text: `⚠️ @${phone} En este grupo no está permitido el ingreso de números con prefijos prohibidos, será expulsado...`,
            mentions: [m.sender]
        });
        await conn.groupParticipantsUpdate(ctx.chatId, [m.sender], "remove");
        return true;
    } catch (err: unknown) {
        logError(err);
    }
    return false;
}

async function upsertUser(m: BotMessage): Promise<void> {
    try {
        // Identidad unificada — misma lógica que context-builder.resolveSender.
        const info = resolveSenderInfo(m);
        if (info.sender) m.sender = info.sender;
        if (info.lid) m.lid = info.lid;

        const userName = m.pushName || 'sin name';
        const num = isUserJid(m.sender) ? jidToPhone(m.sender) : null;

        if (!m.sender) return;

        await upsertUserService({id: m.sender, nombre: userName, num, lid: m.lid});
    } catch (err: unknown) {
        logError(err);
    }
}

