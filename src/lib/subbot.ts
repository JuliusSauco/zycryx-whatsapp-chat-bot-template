import {
    DisconnectReason,
    makeWASocket,
    type WASocket
} from '@whiskeysockets/baileys';
import pino from 'pino';
import type {Logger} from 'pino';
import qrcode from 'qrcode';
import chalk from "chalk";
import NodeCache from 'node-cache';
import {callUpdate, groupsUpdate, messageUpdate, participantsUpdate} from '../core/handler.js';
import {logError, logInfo, logWarn} from './logger.js';
import type {BotMessage} from '../types/message.js';
import type {ExtendedConn} from '../types/context.js';
import {isOtherBotKey} from '../utils/message-filter.js';
import {
    getSubbotConnections,
    registerSubbotConnection,
    unregisterSubbotConnection,
} from '../core/runtime-state.js';
import {registerContactUserSync} from '../core/contact-user-sync.js';
import {useConfiguredAuthState} from '../services/baileys-auth-state.service.js';
import {enqueueBotMessage} from '../core/message-dispatch.js';
import {ReconnectCoordinator} from '../core/reconnect-coordinator.js';
import {BaileysMessageCache} from './baileys-message-cache.js';
import {getBaileysVersion} from './baileys-version.js';

getSubbotConnections()

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
const subbotReconnect = new ReconnectCoordinator({
    baseDelayMs: 1_000,
    maxDelayMs: 60_000,
    onError: (key, error) => logError(`[RECONNECT] Falló la reconexión de ${key}:`, error),
});

export function stopSubbotReconnects(): void {
    subbotReconnect.stop();
}

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
    const authState = await useConfiguredAuthState({
        sessionId: id,
        sessionType: 'subbot',
        ownerId: senderId ?? id,
        legacyFolder: sessionFolder,
    });
    const {state, saveCreds} = authState;
    const scheduleReconnect = (key: string) => subbotReconnect.schedule(key, () =>
        startSubBot(m, conn, caption, isCode, phone, chatId, {}));
    const messageCache = new BaileysMessageCache();
    const version = await getBaileysVersion();

    const sock = makeWASocket({
        logger: createPino({level: 'silent'}),
        printQRInTerminal: false,
        browser: ['Windows', 'Chrome', ''] as [string, string, string],
        auth: state,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async key => messageCache.get(key),
        msgRetryCounterCache,
        userDevicesCache: userDevicesCache as unknown as SocketConfig['userDevicesCache'],
        cachedGroupMetadata: async (jid: string) => groupCache.get(jid),
        version,
        keepAliveIntervalMs: 60_000,
        maxIdleTimeMs: 120_000,
    } as SocketConfig & {maxIdleTimeMs: number}) as BotSocket;
    authState.leaseLost.addEventListener('abort', () => sock.end(new Error('Baileys auth lease perdido')), {once: true});

    sock.groupCache = groupCache;
    registerContactUserSync(sock);
    sock.ev.on('creds.update', saveCreds);
    setupGroupEvents(sock);
    sock.isInit = false

    sock.ev.on('connection.update', async ({connection, lastDisconnect, isNewLogin, qr}) => {
        if (isNewLogin) sock.isInit = false

        if (connection === 'open') {
            sock.isInit = true
            sock.userId = cleanJid(sock.user?.id?.split("@")[0])
            const ownerName = sock.authState.creds.me?.name || "-";
            sock.uptime = Date.now();
            subbotReconnect.reset(id);
            subbotReconnect.reset(sock.userId);
            // Si quedó un socket previo con el mismo userId (reconexión), se reemplaza
            // por el nuevo para que conns nunca apunte a un socket muerto.
            registerSubbotConnection(sock);
            await authState.markConnected(sock.user?.id ?? null);

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
            messageCache.clear();

            // Sacar el socket muerto de conns antes de reintentar; la reconexión
            // exitosa registrará el socket nuevo en el evento 'open'.
            removeConnByUserId(botId);

            if ([DisconnectReason.loggedOut, DisconnectReason.forbidden, DisconnectReason.badSession].includes(reason)) {
                logError(chalk.red(`[💥 SUB-BOT ${botId}] Sesión inválida (código ${reason}). Revocando sin reintentar.`));
                await authState.deleteSession();
                subbotReconnect.cancel(botId);
                return;
            }

            if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
                await authState.dispose();
                scheduleReconnect(botId);
                return;
            }

            await authState.dispose();
            scheduleReconnect(botId);
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

    sock.ev.on("messages.upsert", async ({messages, type}) => {
        if (type !== "notify") return;
        for (const msg of messages) {
            if (!msg.message) continue;
            messageCache.set(msg.key, msg.message);
            const start = Math.floor((sock.uptime || Date.now()) / 1000);
            const messageTimestamp = Number(msg.messageTimestamp || 0);
            if (messageTimestamp < start || ((Date.now() / 1000) - messageTimestamp) > 60) continue;
            if (isOtherBotKey(msg.key.id)) continue;
            enqueueBotMessage(sock, msg);
        }
    });

    sock.ev.on("messages.update", async (updates) => {
        for (const update of updates) {
            messageUpdate(update).catch(logError);
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

function removeConnByUserId(userId: string | undefined): void {
    unregisterSubbotConnection(userId);
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
