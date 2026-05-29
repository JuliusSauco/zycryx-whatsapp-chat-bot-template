import "./config.js";
import fs from 'fs';
import path from 'path';
import chalk from "chalk";
import crypto from "crypto";
import {logCommand} from "../lib/logger.js";
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

export async function participantsUpdate(conn: any, {id, participants, action, author}: {
    id: string;
    participants: any[];
    action: string;
    author?: any
}) {
    try {
        if (!id || !Array.isArray(participants) || !action) {
            console.log(chalk.yellow(`[GRUPO-EVENTO] descartado: id=${id} action=${action} participants=${JSON.stringify(participants)}`));
            return;
        }
        if (!conn?.user?.id) return;
        console.log(chalk.cyan(`[GRUPO-EVENTO] action=${action} grupo=${id} participantes=${participants.length}`));
        // El welcome/bye/promote/demote depende sólo de los settings del grupo,
        // no del modo (public/private) del bot: si el grupo tiene welcome activado,
        // se da bienvenida sin importar cómo entró el participante.

        // Fetch fresco para incluir al nuevo participante; si falla, caer al cache.
        let metadata = await conn.groupMetadata(id).catch(() => null);
        if (metadata) {
            groupMetaCache.set(id, metadata);
            conn?.groupCache?.set?.(id, metadata);
        } else {
            metadata = groupMetaCache.get(id) || null;
        }
        if (!metadata) {
            console.error(chalk.red(`❌ participantsUpdate: sin metadata para ${id}, se omite`));
            return;
        }
        const groupName = metadata.subject || "Grupo"
        const botJidClean = (conn.user?.id || "").replace(/:\d+/, "")
        const botLidClean = (conn.user?.lid || "").replace(/:\d+/, "")

        const isBotAdmin = metadata.participants.some((p: any) => {
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
            console.log(chalk.cyan(`[WELCOME] grupo=${id} settings.welcome=${settings.welcome} (isBotAdmin=${isBotAdmin})`));
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

            // Foto de perfil: sólo se necesita para promote/demote.
            // welcome y bye usan siempre Menu1.jpg, así que ahí no se consulta.
            let ppUrl: string | null = null;
            if (action !== "add" && action !== "remove") {
                try {
                    ppUrl = await conn.profilePictureUrl(participant, "image");
                } catch {
                    ppUrl = null;
                }
            }

            switch (action) {
                case "add":
                    if (settings.welcome) {
                        const groupDesc = metadata.desc || "*ᴜɴ ɢʀᴜᴘᴏ ɢᴇɴɪᴀ😸*\n *sɪɴ ʀᴇɢʟᴀ 😉*"
                        // El mensaje viene siempre de media/text/welcome.txt.
                        const raw = getWelcomeText()
                        const msg = raw
                            .replace(/@user/gi, userTag)
                            .replace(/@group|@subject/gi, groupName)
                            .replace(/@desc/gi, groupDesc)

                        // El welcome usa SIEMPRE la imagen Menu1.jpg (sin foto de perfil).
                        const welcomeImage = getDefaultPpBuffer();
                        try {
                            if (welcomeImage) {
                                await conn.sendMessage(id, {
                                    image: welcomeImage,
                                    caption: msg,
                                    contextInfo: {mentionedJid: [userJid]}
                                }, {quoted: null})
                            } else {
                                // Fallback si Menu1.jpg no está disponible en disco.
                                console.log(chalk.yellow(`[WELCOME] Menu1.jpg no encontrado en ${DEFAULT_PP_PATH} — se envía solo texto`));
                                await conn.sendMessage(id, {
                                    text: msg,
                                    contextInfo: {mentionedJid: [userJid]}
                                }, {quoted: null})
                            }
                            console.log(chalk.green(`[WELCOME] ✅ bienvenida enviada a ${userTag} en "${groupName}"`));
                        } catch (e: any) {
                            console.error(chalk.red(`[WELCOME] ❌ falló el envío a ${userTag} en ${id}:`), e);
                        }
                    } else {
                        console.log(chalk.yellow(`[WELCOME] omitido — welcome desactivado en "${groupName}"`));
                    }
                    break

                case "remove":
                    try {
                        await deleteMessageCount(userJid, id);
                        const botJid = (conn.user?.id || "").replace(/:\d+/, "");
                        if (participant.replace(/:\d+/, "") === botJid) {
                            await markBotLeftGroup(id, botJid);
                            console.log(`[DEBUG] El bot fue eliminado del grupo ${id}. Marcado como 'joined = false'.`);
                        }
                    } catch (err: any) {
                        console.error("❌ Error en 'remove':", err);
                    }

                    if (settings.welcome) {
                        const groupDesc = metadata.desc || "Sin descripción"
                        // El mensaje viene siempre de media/text/bye.txt.
                        const raw = getByeText()
                        const msg = raw
                            .replace(/@user/gi, userTag)
                            .replace(/@group/gi, groupName)
                            .replace(/@desc/gi, groupDesc)

                        // El bye usa SIEMPRE la imagen Menu1.jpg (misma que el welcome).
                        const byeImage = getDefaultPpBuffer();
                        try {
                            if (byeImage) {
                                await conn.sendMessage(id, {
                                    image: byeImage,
                                    caption: msg,
                                    contextInfo: {mentionedJid: [userJid]}
                                }, {quoted: null})
                            } else {
                                // Fallback si Menu1.jpg no está disponible en disco.
                                await conn.sendMessage(id, {
                                    text: msg,
                                    contextInfo: {mentionedJid: [userJid]}
                                }, {quoted: null})
                            }
                            console.log(chalk.green(`[BYE] 👋 despedida enviada a ${userTag} en "${groupName}"`));
                        } catch (e: any) {
                            console.error(chalk.red(`[BYE] ❌ falló el envío a ${userJid} en ${id}:`), e);
                        }
                    } else {
                        console.log(chalk.yellow(`[BYE] omitido — welcome desactivado en "${groupName}"`));
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
                        }, {quoted: null})
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
                        }, {quoted: null})
                    }
                    break
            }
        }
    } catch (err: any) {
        console.error(chalk.red(`❌ Error en participantsUpdate - Acción: ${action} | Grupo: ${id}`), err);
    }
}

export async function groupsUpdate(conn: any, {id, subject, desc, picture}: {
    id: string;
    subject?: string;
    desc?: string;
    picture?: string
}) {
    try {
        const botId = conn.user?.id;
        const botConfig = await getSubbotConfig(botId)
        const modo = botConfig.mode || "public";
        const botJid = conn.user?.id?.replace(/:\d+@/, "@");
        const isCreator = global.owner.map(([v]) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(botJid);

        const settings = await getGroupSettings(id) || {
            welcome: true,
            detect: true,
            antifake: false
        };

        if (modo === "private" && !isCreator) return;
        const metadata = await conn.groupMetadata(id);
        groupMetaCache.set(id, metadata);
        conn?.groupCache?.set?.(id, metadata);
        const groupName = subject || metadata.subject || "Grupo";
        const isBotAdmin = metadata.participants.some((p: any) => p.id.includes(botJid) && p.admin);

        let message = "";
        if (subject) {
            message = `El nombre del grupo ha cambiado a *${groupName}*.`;
        } else if (desc) {
            message = `La descripción del grupo *${groupName}* ha sido actualizada, nueva descripción:\n\n${metadata.desc || "Sin descripción"}`;
        } else if (picture) {
            message = `La foto del grupo *${groupName}* ha sido actualizada.`;
        }

        if (message && settings.detect) {
            await conn.sendMessage(id, {text: message});
        }
    } catch (err: any) {
        console.error(chalk.red("❌ Error en groupsUpdate:"), err);
    }
}

export async function callUpdate(conn: any, call: any) {
    try {
        const callerId = call.from;
        const userTag = `@${callerId.split("@")[0]}`;
        const botConfig = await getSubbotConfig(conn.user?.id);
        if (!botConfig.anti_call) return;
        await conn.sendMessage(callerId, {
            text: `🚫 Está prohibido hacer llamadas, serás bloqueado...`
        });
        await conn.updateBlockStatus(callerId, "block");
    } catch (err: any) {
        console.error(chalk.red("❌ Error en callUpdate:"), err);
    }
}

export async function handler(conn: any, m: any) {
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
        } catch (e: any) {
            console.error(chalk.red(e));
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

    } catch (e: any) {
        if (typeof e === 'string') {
            await m.reply(e);
            return;
        }
        console.error(chalk.red(`❌ Error al ejecutar ${parsed.command}: ${e}`));
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
    console.log(chalk.yellow(`[PERF] total=${total}ms cmd=${command || '-'} chat=${chatId} ${chunks}`));
}

function isDuplicate(m: any): boolean {
    const hash = crypto.createHash("md5").update(m.key.id + (m.key.remoteJid || "")).digest("hex");
    if (processedMessages.has(hash)) return true;
    processedMessages.add(hash);
    setTimeout(() => processedMessages.delete(hash), MESSAGE_DEDUP_TTL);
    return false;
}

function upsertChat(chatId: string, conn: any): void {
    upsertActiveChat({
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        timestamp: Date.now(),
        botId: jidToPhone(cleanJid(conn.user?.id || '')),
    }).catch(console.error);
}

function trackMessageCount(m: any, ctx: {
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

async function antifakeCheck(conn: any, m: any, ctx: {
    chatId: string;
    isGroup: boolean;
    isAdmin: boolean;
    isBotAdmin: boolean;
    botJid: string;
    groupSettings: { antifake: boolean };
}): Promise<boolean> {
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
    } catch (err: any) {
        console.error(err);
    }
    return false;
}

async function upsertUser(m: any): Promise<void> {
    try {
        // Identidad unificada — misma lógica que context-builder.resolveSender.
        const info = resolveSenderInfo(m);
        if (info.sender) m.sender = info.sender;
        if (info.lid) m.lid = info.lid;

        const userName = m.pushName || 'sin name';
        const num = isUserJid(m.sender) ? jidToPhone(m.sender) : null;

        if (!m.sender) return;

        await upsertUserService({id: m.sender, nombre: userName, num, lid: m.lid});
    } catch (err: any) {
        console.error(err);
    }
}

