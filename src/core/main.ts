import * as baileys from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import readlineSync from "readline-sync";
import qrcodeTerminal from "qrcode-terminal";
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
    flushAllDatabaseAuthStates,
    hasStoredAuthCredentials,
    listStoredSubbotSessionIds,
    useConfiguredAuthState,
} from '../services/baileys-auth-state.service.js';
import {drainMessageQueue, stopMessageIntake} from './message-dispatch.js';
import {ReconnectCoordinator} from './reconnect-coordinator.js';
import {BaileysMessageCache} from '../lib/baileys-message-cache.js';
import {getBaileysVersion} from '../lib/baileys-version.js';
import {groupMetadataCache} from './group-metadata-cache.js';
import {startCacheInvalidationListener, stopCacheInvalidationListener} from '../lib/cache-invalidation-listener.js';
import {startHealthServer, stopHealthServer} from './health-server.js';
import {preloadConfigResources} from './config.js';
import {markBotInstanceConnected, registerBotInstanceIdentity, unregisterBotInstanceIdentity} from './bot-instance-identity.js';
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
let usarCodigo = false;
let numero = "";

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
    installProcessHandlers();
    try {
        await loadPlugins();
        await preloadConfigResources();
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

    if (!hayCredencialesPrincipal && !haySubbotsActivos) {
        const mode = ENV.BOT_LINK_MODE.toLowerCase();
        if (!['auto', 'qr', 'code', 'disabled'].includes(mode)) {
            throw new Error(`BOT_LINK_MODE inválido: '${ENV.BOT_LINK_MODE}'. Usa auto, qr, code o disabled.`);
        }
        if (mode === 'disabled' || (mode === 'auto' && !process.stdin.isTTY)) {
            throw new Error('No hay sesiones y el linking interactivo no está disponible. Configura BOT_LINK_MODE=qr o BOT_LINK_MODE=code.');
        }
        const selectedMode = mode === 'auto'
            ? (readlineSync.question('Método de vinculación (1 = QR, 2 = código): ').trim() === '2' ? 'code' : 'qr')
            : mode;
        usarCodigo = selectedMode === 'code';
        if (usarCodigo) {
            const configuredPhone = ENV.BOT_LINK_PHONE.replace(/[^0-9]/g, '');
            if (!configuredPhone && !process.stdin.isTTY) {
                throw new Error('BOT_LINK_PHONE es obligatorio para vinculación por código sin terminal interactiva.');
            }
            numero = configuredPhone || readlineSync.question('Número internacional para vincular: ').replace(/[^0-9]/g, '');
            if (numero.startsWith('52') && !numero.startsWith('521')) {
                numero = '521' + numero.slice(2);
            }
        }
    }

    await cargarSubbots();
    scheduleMaintenance(60_000, cargarSubbots);

    if (hayCredencialesPrincipal || !haySubbotsActivos) {
        try {
            await startBot();
        } catch (err: unknown) {
            logError(chalk.red("❌ Error al iniciar bot principal:"), err);
            throw err;
        }
    } else {
        logWarn(chalk.yellow("⚠️ Subbots activos detectados. Bot principal desactivado automáticamente."));
    }
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

async function startBot() {
    const version = await getBaileysVersion();
    const authState = await useConfiguredAuthState({
        sessionId: 'main', botInstanceId: 'main', sessionType: 'main', legacyFolder: BOT_SESSION_FOLDER,
    });
    const {state, saveCreds} = authState;
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
        if (qr && !usarCodigo && !state.creds.registered) {
            qrcodeTerminal.generate(qr, {small: true});
            logInfo(chalk.yellow('📲 Escanea el código QR desde WhatsApp para vincular el bot.'));
        }

        if (connection === "open") {
            mainReconnect.reset('main');
            markBotInstanceConnected(sock, sock.user?.id);
            try {
                await authState.markConnected(sock.user?.id ?? null);
            } catch (error) {
                logError('[AUTH] No se pudo confirmar la conexión principal en PostgreSQL:', error);
                sock.end(new Error('No se pudo persistir el estado conectado'));
                return;
            }
            logInfo(chalk.bold.greenBright('\n▣─────────────────────────────···\n│\n│❧ 𝙲𝙾𝙽𝙴𝙲𝚃𝙰𝙳𝙾 𝙲𝙾𝚁𝚁𝙴𝙲𝚃𝙰𝙼𝙴𝙽𝚃𝙴 𝙰𝙻 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿 ✅\n│\n▣─────────────────────────────···'));

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
            if (SESSION_TERMINAL_CODES.includes(code)) {
                await authState.deleteSession().catch(error => logError('[AUTH] No se pudo revocar la sesión principal:', error));
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

    if (usarCodigo && !state.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(numero);
                logInfo(chalk.yellow('Código de emparejamiento:'), chalk.greenBright(code));
            } catch {
            }
        }, 2000);
    }

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

