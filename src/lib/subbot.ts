import {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeWASocket,
    useMultiFileAuthState,
    type WAMessage,
    type WASocket
} from '@whiskeysockets/baileys';
import pino from 'pino';
import type {Logger} from 'pino';
import fs from 'fs';
import qrcode from 'qrcode';
import chalk from "chalk";
import NodeCache from 'node-cache';
import {callUpdate, groupsUpdate, handler, messageUpdate, participantsUpdate} from '../core/handler.js';
import {logError, logInfo, logWarn} from './logger.js';
import type {BotMessage} from '../types/message.js';
import type {ExtendedConn} from '../types/context.js';
import {isOtherBotKey} from '../utils/message-filter.js';

if (!(globalThis.conns instanceof Array)) globalThis.conns = []

type BotSocket = WASocket & {
    groupCache?: NodeCache;
    isInit?: boolean;
    userId?: string;
    uptime?: number;
};

type DisconnectErrorLike = {
    output?: {
        statusCode?: number;
    };
};

type SocketConfig = Parameters<typeof makeWASocket>[0];
const createPino = pino as unknown as (options: {level: string}) => Logger;

const cleanJid = (jid: string = ""): string => jid.replace(/:\d+/, "").split("@")[0];
const msgRetryCounterCache = new NodeCache({stdTTL: 0, checkperiod: 0});
const userDevicesCache = new NodeCache({stdTTL: 0, checkperiod: 0});
const groupCache = new NodeCache({stdTTL: 3600, checkperiod: 300});
let reintentos: Record<string, number> = {};

export async function startSubBot(
    m: BotMessage | null,
    conn: ExtendedConn | null,
    caption: string = '',
    isCode: boolean = false,
    phone: string = '',
    chatId: string = '',
    commandFlags: Record<string, boolean> = {}
): Promise<void> {
    const id = phone || (m?.sender || '').split('@')[0];
    const sessionFolder = `./jadibot/${id}`;
    const senderId = m?.sender;
    const {state, saveCreds} = await useMultiFileAuthState(sessionFolder);
    const {version} = await fetchLatestBaileysVersion();

    console.info = () => {
    }
    const sock = makeWASocket({
        logger: createPino({level: 'silent'}),
        printQRInTerminal: false,
        browser: ['Windows', 'Chrome', ''] as [string, string, string],
        auth: state,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => undefined,
        msgRetryCounterCache,
        userDevicesCache: userDevicesCache as unknown as SocketConfig['userDevicesCache'],
        cachedGroupMetadata: async (jid: string) => groupCache.get(jid),
        version,
        keepAliveIntervalMs: 60_000,
        maxIdleTimeMs: 120_000,
    } as SocketConfig & {maxIdleTimeMs: number}) as BotSocket;

    sock.groupCache = groupCache;
    sock.ev.on('creds.update', saveCreds);
    setupGroupEvents(sock);
    sock.isInit = false
    let isInit = true

    sock.ev.on('connection.update', async ({connection, lastDisconnect, isNewLogin, qr}) => {
        if (isNewLogin) sock.isInit = false

        if (connection === 'open') {
            sock.isInit = true
            sock.userId = cleanJid(sock.user?.id?.split("@")[0])
            const ownerName = sock.authState.creds.me?.name || "-";
            sock.uptime = Date.now();
            reintentos[sock.userId] = 0;
            if (globalThis.conns.find((c) => c.userId === sock.userId)) return;
            globalThis.conns.push(sock);

            // Precarga de metadata de grupos para evitar IQs lentos en el primer comando.
            void (async () => {
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    const entries = Object.entries(groups || {});
                    for (const [jid, meta] of entries) {
                        groupCache.set(jid, meta);
                    }
                    logInfo(chalk.cyan(`📦 [SUB-BOT ${sock.userId}] Precargados ${entries.length} grupos en cache`));
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    logWarn(chalk.yellow(`⚠️ [SUB-BOT ${sock.userId}] No se pudo precargar grupos:`), message);
                }
            })();

            if (isCode && m?.chat && conn && senderId?.endsWith("@s.whatsapp.net")) {
                conn.sendMessage(m.chat, {text: `*Conectado exitosamente con WhatsApp ✅*\n\n*💻 Bot:* +${sock.userId}\n*👤 Dueño:* ${ownerName}\n\n*Nota: Con la nueva función de auto-reinicio (Beta)*, Si el bot principal se reinicia o se desactiva, los sub-bots se reiniciarán automáticamente, asegurando que sigan activos sin interrupciones.\n\n> *Unirte a nuestro canal para informarte de todas la Actualizaciónes/novedades sobre el bot*\n${info.nna}`}, {quoted: m});
                delete commandFlags[senderId];
            }
            logInfo(chalk.bold.cyanBright(`\n✅ SUB-BOT CONECTADO: ${sock.userId} `))
        }

        if (connection === 'close') {
            const botId = sock.userId || id;
            const reason = (lastDisconnect?.error as DisconnectErrorLike | undefined)?.output?.statusCode || 0;
            const intentos = reintentos[botId] || 0;
            reintentos[botId] = intentos + 1;

            if ([401, 403].includes(reason)) {
                if (intentos < 5) {
                    logWarn(`${chalk.red(`[❌ SUB-BOT ${botId}] Conexión cerrada (código ${reason}) intento ${intentos}/5`)} → Reintentando...`);
                    setTimeout(() => {
                        startSubBot(m, conn, caption, isCode, phone, chatId, {});
                    }, 3000);
                } else {
                    logError(chalk.red(`[💥 SUB-BOT ${botId}] Falló tras 5 intentos. Eliminando sesión.`));
                    try {
                        fs.rmSync(sessionFolder, {recursive: true, force: true});
                    } catch (e) {
                        logError(`[⚠️] No se pudo eliminar la carpeta ${sessionFolder}:`, e);
                    }
                    delete reintentos[botId];
                }
                return;
            }

            if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
                setTimeout(() => {
                    startSubBot(m, conn, caption, isCode, phone, chatId, {});
                }, 3000);
                return;
            }

            setTimeout(() => {
                startSubBot(m, conn, caption, isCode, phone, chatId, {});
            }, 3000);
        }

        if (qr && !isCode && m && conn && senderId && commandFlags[senderId]) {
            try {
                const qrBuffer = await qrcode.toBuffer(qr, {scale: 8});
                const msg = await conn.sendMessage(m.chat, {image: qrBuffer, caption: caption}, {quoted: m});
                delete commandFlags[senderId];
                setTimeout(() => conn.sendMessage(m.chat, {delete: msg.key}).catch(() => {
                }), 60000);
            } catch (err) {
                logError("[QR Error]", err);
            }
        }

        if (qr && isCode && phone && conn && chatId && senderId && commandFlags[senderId]) {
            try {
                let codeGen = await sock.requestPairingCode(phone);
                codeGen = codeGen.match(/.{1,4}/g)?.join("-") || codeGen;
                const msg = await conn.sendMessage(chatId, {
                    image: {url: 'https://cdn.skyultraplus.com/uploads/u4/9708a54ced0b5fed.jpg'},
                    caption: caption
                }, {quoted: m});
                const msgCode = await conn.sendMessage(chatId, {text: codeGen}, {quoted: m});
                delete commandFlags[senderId];
                setTimeout(async () => {
                    try {
                        await conn.sendMessage(chatId, {delete: msg.key});
                        await conn.sendMessage(chatId, {delete: msgCode.key});
                    } catch {
                    }
                }, 60000);
            } catch (err) {
                logError("[Código Error]", err);
            }
        }
    });

    process.on('uncaughtException', logError);
    process.on('unhandledRejection', logError);

    sock.ev.on("messages.upsert", async ({messages, type}) => {
        if (type !== "notify") return;
        for (const msg of messages) {
            if (!msg.message) continue;
            const start = Math.floor((sock.uptime || Date.now()) / 1000);
            const messageTimestamp = Number(msg.messageTimestamp || 0);
            if (messageTimestamp < start || ((Date.now() / 1000) - messageTimestamp) > 60) continue;
            if (isOtherBotKey(msg.key.id)) continue;
            try {
                await handler(sock as unknown as ExtendedConn, msg as unknown as BotMessage);
            } catch (err) {
                logError(err);
            }
        }
    });

    sock.ev.on("messages.update", async (updates) => {
        for (const update of updates) {
            messageUpdate(update).catch(console.error);
        }
    });

    sock.ev.on("call", async (calls) => {
        try {
            for (const call of calls) {
                await callUpdate(sock, call);
            }
        } catch (err) {
            logError(chalk.red("❌ Error procesando call.update:"), err);
        }
    });
}

function setupGroupEvents(sock: BotSocket): void {
    sock.ev.on("group-participants.update", async (update) => {
        try {
            await participantsUpdate(sock, update);
        } catch (err) {
            logError("[ ❌ ] SUB-BOT Error procesando group-participants.update:", err);
        }
    });

    sock.ev.on("groups.update", async (updates) => {
        try {
            for (const update of updates) {
                if (!update.id) continue;
                await groupsUpdate(sock, {...update, id: update.id});
            }
        } catch (err) {
            logError("[ ❌ ] SUB-BOT Error procesando groups.update:", err);
        }
    });
}
