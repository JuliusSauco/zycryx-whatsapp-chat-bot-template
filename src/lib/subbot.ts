import {botInfo} from "../core/config.js";
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
import {logError, logInfo, logWarn} from './logger.js';
import type {BotMessage} from '../types/message.js';
import type {ExtendedConn} from '../types/context.js';
import {
    getSubbotConnections,
    registerSubbotConnection,
    unregisterSubbotConnection,
} from '../core/runtime-state.js';
import {useConfiguredAuthState} from '../services/baileys-auth-state.service.js';
import {ReconnectCoordinator} from '../core/reconnect-coordinator.js';
import {BaileysMessageCache} from './baileys-message-cache.js';
import {getBaileysVersion} from './baileys-version.js';
import {groupMetadataCache} from '../core/group-metadata-cache.js';
import {markBotInstanceConnected, registerBotInstanceIdentity, unregisterBotInstanceIdentity} from '../core/bot-instance-identity.js';
import {isApplicationStopping} from '../core/application-lifecycle.js';
import {registerBotSocketEvents} from '../core/bot-socket-events.js';

getSubbotConnections()

type BotSocket = WASocket & {
    groupCache?: typeof groupMetadataCache;
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
const msgRetryCounterCache = new NodeCache({stdTTL: 3600, checkperiod: 300, maxKeys: 25_000});
const userDevicesCache = new NodeCache({stdTTL: 3600, checkperiod: 300, maxKeys: 25_000});
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
    const version = await getBaileysVersion();
    const authState = await useConfiguredAuthState({
        sessionId: id,
        botInstanceId: id,
        sessionType: 'subbot',
        ownerId: senderId ?? id,
        legacyFolder: sessionFolder,
    });
    const {state, saveCreds} = authState;
    const scheduleReconnect = (key: string) => subbotReconnect.schedule(key, () =>
        startSubBot(m, conn, caption, isCode, phone, chatId, {}));
    const messageCache = new BaileysMessageCache();
    let sock: BotSocket;
    try {
        sock = makeWASocket({
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
        cachedGroupMetadata: async (jid: string) => groupMetadataCache.get(jid),
        version,
        keepAliveIntervalMs: 60_000,
        maxIdleTimeMs: 120_000,
        } as SocketConfig & {maxIdleTimeMs: number}) as BotSocket;
    } catch (error) {
        await authState.dispose().catch(disposeError => logError(`[AUTH] Error liberando sesión parcial ${id}:`, disposeError));
        throw error;
    }
    registerBotInstanceIdentity(sock, {
        instanceId: id,
        sessionId: id,
        instanceType: 'subbot',
    });
    authState.leaseLost.addEventListener('abort', () => sock.end(new Error('Baileys auth lease perdido')), {once: true});

    sock.ev.on('creds.update', saveCreds);
    registerBotSocketEvents({
        socket: sock,
        messageCache,
        label: `subbot:${id}`,
        acceptMessage: message => {
            const startedAt = Math.floor((sock.uptime || Date.now()) / 1000);
            const messageTimestamp = Number(message.messageTimestamp || 0);
            return messageTimestamp >= startedAt && Date.now() / 1000 - messageTimestamp <= 60;
        },
    });
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
            markBotInstanceConnected(sock, sock.user?.id);
            try {
                await authState.markConnected(sock.user?.id ?? null);
            } catch (error) {
                logError(`[AUTH] No se pudo confirmar la conexión de ${id} en PostgreSQL:`, error);
                sock.end(new Error('No se pudo persistir el estado conectado'));
                return;
            }

            // Precarga de metadata de grupos para evitar IQs lentos en el primer comando.
            void (async () => {
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    const entries = Object.entries(groups || {});
                    for (const [jid, meta] of entries) {
                        groupMetadataCache.set(jid, meta);
                    }
                    logInfo(chalk.cyan(`📦 [SUB-BOT ${sock.userId}] Precargados ${entries.length} grupos en cache`));
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    logWarn(chalk.yellow(`⚠️ [SUB-BOT ${sock.userId}] No se pudo precargar grupos:`), message);
                }
            })();

            if (isCode && m?.chat && conn && senderId?.endsWith("@s.whatsapp.net")) {
                conn.sendMessage(m.chat, {text: `*Conectado exitosamente con WhatsApp ✅*\n\n*💻 Bot:* +${sock.userId}\n*👤 Dueño:* ${ownerName}\n\n*Nota: Con la nueva función de auto-reinicio (Beta)*, Si el bot principal se reinicia o se desactiva, los sub-bots se reiniciarán automáticamente, asegurando que sigan activos sin interrupciones.\n\n> *Unirte a nuestro canal para informarte de todas la Actualizaciónes/novedades sobre el bot*\n${botInfo.nna}`}, {quoted: m});
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
            unregisterBotInstanceIdentity(sock);
            if (isApplicationStopping()) return;

            if ([DisconnectReason.loggedOut, DisconnectReason.forbidden, DisconnectReason.badSession].includes(reason)) {
                logError(chalk.red(`[💥 SUB-BOT ${botId}] Sesión inválida (código ${reason}). Revocando sin reintentar.`));
                await authState.deleteSession().catch(error => logError(`[AUTH] No se pudo revocar ${botId}:`, error));
                subbotReconnect.cancel(botId);
                return;
            }

            if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
                try {
                    await authState.dispose();
                    scheduleReconnect(botId);
                } catch (error) {
                    logError(`[AUTH] Reconexión de ${botId} bloqueada por fallo de persistencia/cierre:`, error);
                }
                return;
            }

            try {
                await authState.dispose();
                scheduleReconnect(botId);
            } catch (error) {
                logError(`[AUTH] Reconexión de ${botId} bloqueada por fallo de persistencia/cierre:`, error);
            }
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

}

function removeConnByUserId(userId: string | undefined): void {
    unregisterSubbotConnection(userId);
}
