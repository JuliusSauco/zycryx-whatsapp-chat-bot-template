import * as baileys from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import qrcode from "qrcode";
import pino from "pino";
import type {Logger} from "pino";
import NodeCache from 'node-cache';
import {startSubBot, stopSubbotReconnects} from "../lib/subbot.js";
import "./config.js";
import {loadPlugins, stopPluginWatchers} from '../lib/plugins.js';
import {drainBackgroundTasks, stopBackgroundTaskIntake} from '../lib/background-task-queue.js';
import {ENV} from './env.js';
import {drainScheduledTasks, startScheduledTasks, stopScheduledTasks} from './scheduled-tasks.js';
import {syncStartupGroupAdmins} from './startup-admin-sync.js';
import {logDebug, logError, logInfo, logWarn} from '../lib/logger.js';
import {
    getSubbotConnections,
    getMainConnection,
    clearMainConnection,
    hasSubbotConnection,
    isRuntimeSessionActive,
    setMainConnection,
} from './runtime-state.js';
import {application} from './composition-root.js';
import {
    disposeAllDatabaseAuthStates,
    configureBaileysAuthRepository,
    deleteStoredAuthSession,
    flushAllDatabaseAuthStates,
    hasStoredAuthCredentials,
    listStoredSubbotSessionIds,
    useConfiguredAuthState,
} from '../services/baileys-auth-state.service.js';
import {
    registerMainLinkStarter,
    resetMainLinkState,
    type MainLinkRequest,
    updateMainLinkState,
} from './main-linking.js';
import {drainMessageQueue, stopMessageIntake} from './message-dispatch.js';
import {ReconnectCoordinator} from './reconnect-coordinator.js';
import {BaileysMessageCache} from '../lib/baileys-message-cache.js';
import {getBaileysVersion} from '../lib/baileys-version.js';
import {groupMetadataCache} from './group-metadata-cache.js';
import {startCacheInvalidationListener, stopCacheInvalidationListener} from '../lib/cache-invalidation-listener.js';
import {startRedisRuntime, stopRedisRuntime} from '../lib/redis-runtime.js';
import {startHealthServer, stopHealthServer} from './health-server.js';
import {preloadConfigResources} from './config.js';
import {getBotInstanceIdentity, markBotInstanceConnected, registerBotInstanceIdentity, unregisterBotInstanceIdentity} from './bot-instance-identity.js';
import {
    beginApplicationShutdown,
    isApplicationStopping,
    markApplicationRunning,
    markApplicationStopped,
} from './application-lifecycle.js';
import {drainBotSocketEvents, registerBotSocketEvents} from './bot-socket-events.js';

type BotSocket = baileys.WASocket & {
    groupCache?: typeof groupMetadataCache;
};

type DisconnectErrorLike = {
    output?: {
        statusCode?: number;
    };
};

type SocketConfig = Parameters<typeof baileys.makeWASocket>[0];
const createPino = pino as unknown as (options: {level: string}) => Logger;

const BOT_SESSION_FOLDER = "./BotSession";
const BOT_CREDS_PATH = path.join(BOT_SESSION_FOLDER, "creds.json");
if (ENV.BAILEYS_AUTH_STATE_SOURCE === 'files' && !fs.existsSync(BOT_SESSION_FOLDER)) fs.mkdirSync(BOT_SESSION_FOLDER);

getSubbotConnections();
const reconectando = new Set();
const maintenanceTimers = new Set<NodeJS.Timeout>();
const activeMaintenanceTasks = new Set<Promise<void>>();
const mainReconnect = new ReconnectCoordinator({
    baseDelayMs: 1_000,
    maxDelayMs: 60_000,
    onError: (_key, error) => logError('[RECONNECT] Falló la reconexión principal:', error),
});
let activeLinkRequest: MainLinkRequest | null = null;
const manualSocketClosures = new WeakSet<object>();

// Códigos de cierre que indican sesión inválida/terminada: reconectar no sirve;
// se revoca el estado activo y se solicita una nueva vinculación.
const SESSION_TERMINAL_CODES: number[] = [
    baileys.DisconnectReason.loggedOut,
    baileys.DisconnectReason.forbidden,
    baileys.DisconnectReason.badSession,
];

// Listeners de proceso y tareas de mantenimiento se registran UNA sola vez a nivel
// de módulo. Antes vivían dentro de startBot() y se duplicaban en cada reconexión.
let applicationStarted = false;

export async function startApplication(): Promise<void> {
    if (applicationStarted) return;
    applicationStarted = true;
    configureBaileysAuthRepository(application.baileysAuth);
    registerMainLinkStarter(replaceMainSession);
    installProcessHandlers();
    try {
        await loadPlugins();
        await preloadConfigResources();
        await startRedisRuntime();
        await startCacheInvalidationListener();
        await startHealthServer();
        startScheduledTasks();
        startMaintenanceTasks();
        await main();
        markApplicationRunning();
    } catch (error) {
        logError('[STARTUP] Error fatal iniciando el bot:', error);
        await shutdown(1);
        throw error;
    }
}

function installProcessHandlers(): void {
    process.on('uncaughtException', error => {
        logError('[PROCESS] Excepción no capturada; iniciando cierre controlado:', error);
        void shutdown(1);
    });
    process.on('unhandledRejection', error => {
        logError('[PROCESS] Rechazo no manejado; iniciando cierre controlado:', error);
        void shutdown(1);
    });
    process.once('SIGINT', () => void shutdown(0));
    process.once('SIGTERM', () => void shutdown(0));
}

async function main() {
    const hayCredencialesPrincipal = ENV.BAILEYS_AUTH_STATE_SOURCE === 'database'
        ? await hasStoredAuthCredentials('main')
        : fs.existsSync(BOT_CREDS_PATH);
    const subbotsFolder = "./jadibot";
    const haySubbotsActivos = ENV.BAILEYS_AUTH_STATE_SOURCE === 'database'
        ? (await listStoredSubbotSessionIds()).length > 0
        : fs.existsSync(subbotsFolder) && fs.readdirSync(subbotsFolder)
            .some(folder => fs.existsSync(path.join(subbotsFolder, folder, "creds.json")));

    await cargarSubbots();
    scheduleMaintenance(60_000, cargarSubbots);

    if (hayCredencialesPrincipal) {
        try {
            await startBot();
        } catch (err: unknown) {
            logError(chalk.red("❌ Error al iniciar bot principal:"), err);
            throw err;
        }
    } else if (haySubbotsActivos) {
        logWarn(chalk.yellow("⚠️ Subbots activos detectados. Bot principal desactivado automáticamente."));
    } else {
        resetMainLinkState();
        logInfo('[AUTH] Sin sesión principal. Elige QR o código desde la consola web.');
    }
}

async function replaceMainSession(request: MainLinkRequest): Promise<void> {
    const current = getMainConnection();
    const connected = Boolean(getBotInstanceIdentity(current)?.botJid);
    const hasAccount = Boolean(current?.user?.id);
    if (connected && !request.replaceSession) {
        throw new Error('Confirma que deseas reemplazar la sesión conectada.');
    }

    mainReconnect.cancel('main');
    updateMainLinkState({
        phase: 'preparing',
        method: request.method,
        phone: request.phone,
        pairingCode: null,
        qrDataUrl: null,
        linkedNumber: null,
        message: connected ? 'Cerrando la sesión anterior…' : 'Preparando una sesión nueva…',
    });

    try {
        if (current) {
            manualSocketClosures.add(current);
            if (hasAccount) {
                await Promise.race([
                    current.logout(),
                    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8_000)),
                ]).catch(error => logWarn('[AUTH] WhatsApp no confirmó el cierre remoto:', error));
            }
            current.end(new Error('Sesión reemplazada desde la consola web'));
            clearMainConnection(current);
            unregisterBotInstanceIdentity(current);
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        await deleteMainSessionStorage();
        activeLinkRequest = request;
        await startBot(request);
    } catch (error) {
        activeLinkRequest = null;
        updateMainLinkState({
            phase: 'error',
            pairingCode: null,
            qrDataUrl: null,
            message: error instanceof Error ? error.message : 'No se pudo preparar la sesión nueva.',
        });
        throw error;
    }
}

async function deleteMainSessionStorage(): Promise<void> {
    if (ENV.BAILEYS_AUTH_STATE_SOURCE === 'database') {
        await deleteStoredAuthSession('main');
        return;
    }
    await fs.promises.rm(BOT_SESSION_FOLDER, {recursive: true, force: true});
    await fs.promises.mkdir(BOT_SESSION_FOLDER, {recursive: true});
}

async function cargarSubbots() {
    const folder = "./jadibot";
    const databaseIds = ENV.BAILEYS_AUTH_STATE_SOURCE === 'database'
        ? await listStoredSubbotSessionIds()
        : [];
    const legacyIds = fs.existsSync(folder)
        ? fs.readdirSync(folder).filter(userId => fs.existsSync(path.join(folder, userId, 'creds.json')))
        : [];
    const subbotIds = [...new Set([...databaseIds, ...legacyIds])];
//logInfo(chalk.bold.yellowBright(`📦 Subbots cargados: ${subbotIds.length}`));

    for (const userId of subbotIds) {
        if (hasSubbotConnection(userId)) continue;
        if (reconectando.has(userId)) continue;

        try {
            reconectando.add(userId);
            await startSubBot(null, null, "Auto reconexión", false, userId, '');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logWarn(chalk.red(`❌ Falló la carga de ${userId}: ${message}`));
        } finally {
            reconectando.delete(userId);
        }

        await new Promise(res => setTimeout(res, 2500))
    }
}

async function startBot(linkRequest: MainLinkRequest | null = activeLinkRequest) {
    const version = await getBaileysVersion();
    const authState = await useConfiguredAuthState({
        sessionId: 'main', botInstanceId: 'main', sessionType: 'main', legacyFolder: BOT_SESSION_FOLDER,
    });
    const {state, saveCreds} = authState;
    if (!state.creds.registered && !linkRequest) {
        await authState.deleteSession();
        resetMainLinkState('La sesión anterior incompleta fue eliminada. Elige QR o código para comenzar.');
        logInfo('[AUTH] Sesión principal incompleta eliminada; esperando selección en la consola web.');
        return;
    }
    const msgRetryCounterCache = new NodeCache({stdTTL: 3600, checkperiod: 300, maxKeys: 10_000});
    const userDevicesCache = new NodeCache({stdTTL: 3600, checkperiod: 300, maxKeys: 10_000});
    const messageCache = new BaileysMessageCache();
    let sock: baileys.WASocket;
    try {
        sock = baileys.makeWASocket({
        logger: createPino({level: 'silent'}),
        browser: ['Windows', 'Chrome', ''] as [string, string, string],
        auth: {
            creds: state.creds,
            keys: baileys.makeCacheableSignalKeyStore(state.keys, createPino({level: 'silent'}))
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async key => messageCache.get(key),
        msgRetryCounterCache: msgRetryCounterCache,
        userDevicesCache: userDevicesCache as unknown as SocketConfig['userDevicesCache'],
        cachedGroupMetadata: async (jid: string) => groupMetadataCache.get(jid),
        version: version,
        defaultQueryTimeoutMs: 30_000,
        keepAliveIntervalMs: 55000,
        });
    } catch (error) {
        await authState.dispose().catch(disposeError => logError('[AUTH] Error liberando sesión tras inicio parcial:', disposeError));
        throw error;
    }
    registerBotInstanceIdentity(sock, {
        instanceId: 'main',
        sessionId: 'main',
        instanceType: 'main',
    });
    authState.leaseLost.addEventListener('abort', () => sock.end(new Error('Baileys auth lease perdido')), {once: true});

    const botSock = sock as BotSocket;
    setMainConnection(sock);
    registerBotSocketEvents({
        socket: botSock,
        messageCache,
        includeJoinRequests: true,
        label: 'main',
        acceptMessage: message => !message.messageTimestamp
            || Date.now() / 1000 - Number(message.messageTimestamp) <= 120,
    });
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({connection, lastDisconnect, qr}) => {
        const code = (lastDisconnect?.error as DisconnectErrorLike | undefined)?.output?.statusCode || 0;

        // Baileys 7 deprecó printQRInTerminal (la opción ya no hace nada),
        // así que el QR de vinculación se renderiza manualmente desde el evento.
        if (qr && linkRequest?.method === 'qr' && activeLinkRequest === linkRequest && !state.creds.registered) {
            try {
                const qrDataUrl = await qrcode.toDataURL(qr, {width: 360, margin: 2, errorCorrectionLevel: 'M'});
                updateMainLinkState({
                    phase: 'awaiting',
                    qrDataUrl,
                    pairingCode: null,
                    message: 'Escanea este QR desde WhatsApp. Se actualizará si expira.',
                });
            } catch (error) {
                updateMainLinkState({phase: 'error', message: 'No se pudo generar la imagen QR.'});
                logError('[AUTH] No se pudo renderizar el QR:', error);
            }
        }

        if (connection === "open") {
            mainReconnect.reset('main');
            activeLinkRequest = null;
            markBotInstanceConnected(sock, sock.user?.id);
            try {
                await authState.markConnected(sock.user?.id ?? null);
            } catch (error) {
                logError('[AUTH] No se pudo confirmar la conexión principal en PostgreSQL:', error);
                sock.end(new Error('No se pudo persistir el estado conectado'));
                return;
            }
            logInfo(chalk.bold.greenBright('\n▣─────────────────────────────···\n│\n│❧ 𝙲𝙾𝙽𝙴𝙲𝚃𝙰𝙳𝙾 𝙲𝙾𝚁𝚁𝙴𝙲𝚃𝙰𝙼𝙴𝙽𝚃𝙴 𝙰𝙻 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿 ✅\n│\n▣─────────────────────────────···'));
            updateMainLinkState({
                phase: 'connected',
                method: null,
                phone: null,
                pairingCode: null,
                qrDataUrl: null,
                linkedNumber: phoneFromJid(sock.user?.id),
                message: 'Sesión sincronizada y guardada en PostgreSQL.',
            });

            // Precarga de metadata de todos los grupos para evitar IQs lentos en el primer uso.
            void (async () => {
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    const entries = Object.entries(groups || {});
                    for (const [jid, meta] of entries) {
                        groupMetadataCache.set(jid, meta);
                    }
                    logInfo(chalk.cyan(`📦 Precargados ${entries.length} grupos en cache`));
                    await syncStartupGroupAdmins(entries);
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    logWarn(chalk.yellow("⚠️ No se pudo precargar metadata de grupos:"), message);
                }
            })();
        }

        if (connection === "close") {
            clearMainConnection(sock);
            unregisterBotInstanceIdentity(sock);
            messageCache.clear();
            if (isApplicationStopping()) return;
            if (manualSocketClosures.has(sock)) {
                manualSocketClosures.delete(sock);
                return;
            }
            if (SESSION_TERMINAL_CODES.includes(code)) {
                const wasRegistered = state.creds.registered;
                await authState.deleteSession().catch(error => logError('[AUTH] No se pudo revocar la sesión principal:', error));
                if (!wasRegistered) {
                    updateMainLinkState({phase: 'preparing', pairingCode: null, qrDataUrl: null, message: 'La vinculación expiró; generando una nueva…'});
                    logWarn(chalk.yellow(`♻️ La vinculación expiró (código ${code}). Se generará una nueva con backoff.`));
                    mainReconnect.schedule('main', () => startBot(activeLinkRequest));
                    return;
                }
                activeLinkRequest = null;
                resetMainLinkState('La sesión dejó de ser válida. Elige QR o código para vincular otra cuenta.');
                logError(chalk.red(`❌ Sesión inválida (código ${code}). Se eliminó del almacén activo; vuelve a vincular el bot.`));
                return;
            }
            logWarn(chalk.yellow(`♻️ Conexión cerrada (código ${code}). Reconexión con backoff programada.`));
            try {
                await authState.dispose();
                mainReconnect.schedule('main', startBot);
            } catch (error) {
                logError('[AUTH] Reconexión principal bloqueada porque no se pudo persistir/cerrar la sesión:', error);
            }
        }
    });

    if (linkRequest?.method === 'code' && linkRequest.phone && activeLinkRequest === linkRequest && !state.creds.registered) {
        setTimeout(async () => {
            if (activeLinkRequest !== linkRequest) return;
            try {
                const code = await sock.requestPairingCode(linkRequest.phone!);
                updateMainLinkState({
                    phase: 'awaiting',
                    pairingCode: code,
                    qrDataUrl: null,
                    message: 'Introduce este código en WhatsApp para sincronizar la cuenta.',
                });
                logInfo(chalk.yellow('Código de emparejamiento:'), chalk.greenBright(code));
            } catch (error) {
                updateMainLinkState({phase: 'error', message: 'WhatsApp no pudo generar el código. Revisa el número e inténtalo nuevamente.'});
                logError('[AUTH] No se pudo solicitar el código de emparejamiento:', error);
            }
        }, 2000);
    }

}

function phoneFromJid(jid: string | null | undefined): string | null {
    if (!jid) return null;
    return jid.split('@')[0]?.split(':')[0] || null;
}

/**
 * Tareas de mantenimiento del proceso (independientes del socket):
 * limpieza de tmp y mantenimiento del adapter legacy de archivos.
 * Se inician una sola vez a nivel de módulo; NO deben vivir dentro de
 * startBot() porque cada reconexión las duplicaría.
 */
function startMaintenanceTasks(): void {
    scheduleMaintenance(30_000, cleanTemporaryFiles);
    if (ENV.BAILEYS_AUTH_STATE_SOURCE === 'files') {
        scheduleMaintenance(10 * 60_000, pruneLegacyPreKeys);
    }
}
function scheduleMaintenance(intervalMs: number, task: () => Promise<void>): void {
    let running = false;
    const timer = setInterval(() => {
        if (running || isApplicationStopping()) return;
        running = true;
        const run = task().catch(logError).finally(() => {
            running = false;
            activeMaintenanceTasks.delete(run);
        });
        activeMaintenanceTasks.add(run);
    }, intervalMs);
    timer.unref?.();
    maintenanceTimers.add(timer);
}

async function cleanTemporaryFiles(): Promise<void> {
    const tmp = './tmp';
    const files = await fs.promises.readdir(tmp).catch(() => []);
    const now = Date.now();
    await Promise.all(files.filter(file => !file.endsWith('.file')).map(async file => {
        const filePath = path.join(tmp, file);
        const stats = await fs.promises.stat(filePath).catch(() => null);
        if (stats?.isFile() && now - stats.mtimeMs > 3 * 60_000) {
            await fs.promises.rm(filePath, {force: true});
        }
    }));
}

async function pruneLegacyPreKeys(): Promise<void> {
    const subbotIds = await fs.promises.readdir('./jadibot').catch(() => []);
    for (const id of subbotIds) {
        if (isRuntimeSessionActive(id)) continue;
        const sessionPath = path.join('./jadibot', id);
        const files = await fs.promises.readdir(sessionPath).catch(() => []);
        const prekeys = await Promise.all(files.filter(file => file.startsWith('pre-key')).map(async file => ({
            file,
            mtimeMs: (await fs.promises.stat(path.join(sessionPath, file))).mtimeMs,
        })));
        if (prekeys.length <= 500) continue;
        prekeys.sort((a, b) => a.mtimeMs - b.mtimeMs);
        await Promise.all(prekeys.slice(0, prekeys.length - 300)
            .map(item => fs.promises.rm(path.join(sessionPath, item.file), {force: true})));
    }
}

let shutdownPromise: Promise<void> | null = null;

function shutdown(exitCode: number): Promise<void> {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = performShutdown(exitCode);
    return shutdownPromise;
}

async function performShutdown(exitCode: number): Promise<void> {
    beginApplicationShutdown('Cierre controlado de la aplicación');
    mainReconnect.stop();
    stopSubbotReconnects();
    stopScheduledTasks();
    stopPluginWatchers();
    await stopHealthServer().catch(error => logError('[HEALTH] Error cerrando endpoint:', error));
    stopMessageIntake();
    const sockets = [getMainConnection(), ...getSubbotConnections()].filter((socket): socket is baileys.WASocket => Boolean(socket));
    for (const socket of sockets) socket.end(new Error('Cierre controlado'));
    for (const timer of maintenanceTimers) clearInterval(timer);
    maintenanceTimers.clear();
    const messagesDrained = await drainMessageQueue(10_000);
    if (!messagesDrained) logWarn('⚠️ Cierre con mensajes pendientes tras 10 segundos.');
    const socketEventsDrained = await drainBotSocketEvents(10_000);
    if (!socketEventsDrained) logWarn('⚠️ Cierre con eventos de socket activos tras 10 segundos.');
    const scheduledDrained = await drainScheduledTasks(10_000);
    if (!scheduledDrained) logWarn('⚠️ Cierre con tareas programadas activas tras 10 segundos.');
    const maintenanceDrained = await drainMaintenanceTasks(10_000);
    if (!maintenanceDrained) logWarn('⚠️ Cierre con mantenimiento activo tras 10 segundos.');
    stopBackgroundTaskIntake();
    const drained = await drainBackgroundTasks(10_000);
    if (!drained) logWarn('⚠️ Cierre con tareas background pendientes tras 10 segundos.');
    await flushAllDatabaseAuthStates().catch(error => logError('[AUTH] Error vaciando sesiones durante cierre:', error));
    await disposeAllDatabaseAuthStates().catch(error => logError('[AUTH] Error liberando sesiones durante cierre:', error));
    await stopCacheInvalidationListener().catch(error => logError('[CACHE] Error cerrando listener:', error));
    await stopRedisRuntime().catch(error => logError('[REDIS] Error cerrando cliente:', error));
    for (const socket of sockets) unregisterBotInstanceIdentity(socket);
    clearMainConnection();
    await application.databasePool.end().catch(error => logError('[DB] Error cerrando pool:', error));
    markApplicationStopped();
    process.exitCode = exitCode;
}

async function drainMaintenanceTasks(timeoutMs: number): Promise<boolean> {
    const snapshot = [...activeMaintenanceTasks];
    if (!snapshot.length) return true;
    let timeout: NodeJS.Timeout | undefined;
    const completed = await Promise.race([
        Promise.allSettled(snapshot).then(() => true),
        new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), timeoutMs); }),
    ]);
    if (timeout) clearTimeout(timeout);
    return completed;
}

