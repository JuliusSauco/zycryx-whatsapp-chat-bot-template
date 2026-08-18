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
import {callUpdate, groupJoinRequest, groupsUpdate, messageUpdate, participantsUpdate} from "./handler.js";
import {loadPlugins, stopPluginWatchers} from '../lib/plugins.js';
import {drainBackgroundTasks} from '../lib/background-task-queue.js';
import {ENV} from './env.js';
import {isOtherBotKey} from '../utils/message-filter.js';
import {startScheduledTasks, stopScheduledTasks} from './scheduled-tasks.js';
import {syncStartupGroupAdmins} from './startup-admin-sync.js';
import {registerContactUserSync} from './contact-user-sync.js';
import {logDebug, logError, logInfo, logWarn} from '../lib/logger.js';
import {
    getSubbotConnections,
    getMainConnection,
    clearMainConnection,
    hasSubbotConnection,
    isRuntimeSessionActive,
    setMainConnection,
} from './runtime-state.js';
import {db} from '../lib/postgres.js';
import {
    flushAllDatabaseAuthStates,
    hasStoredAuthCredentials,
    listStoredSubbotSessionIds,
    useConfiguredAuthState,
} from '../services/baileys-auth-state.service.js';
import {drainMessageQueue, enqueueBotMessage} from './message-dispatch.js';
import {ReconnectCoordinator} from './reconnect-coordinator.js';
import {BaileysMessageCache} from '../lib/baileys-message-cache.js';
import {getBaileysVersion} from '../lib/baileys-version.js';

type BotSocket = baileys.WASocket & {
    groupCache?: NodeCache;
};

type DisconnectErrorLike = {
    output?: {
        statusCode?: number;
    };
};

type SocketConfig = Parameters<typeof baileys.makeWASocket>[0];
const createPino = pino as unknown as (options: {level: string}) => Logger;

await loadPlugins();
startScheduledTasks();
const BOT_SESSION_FOLDER = "./BotSession";
const BOT_CREDS_PATH = path.join(BOT_SESSION_FOLDER, "creds.json");
if (ENV.BAILEYS_AUTH_STATE_SOURCE === 'files' && !fs.existsSync(BOT_SESSION_FOLDER)) fs.mkdirSync(BOT_SESSION_FOLDER);

getSubbotConnections();
const reconectando = new Set();
const maintenanceTimers = new Set<NodeJS.Timeout>();
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
startMaintenanceTasks();

void main().catch(error => {
    logError('[STARTUP] Error fatal iniciando el bot:', error);
    void shutdown(1);
});

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
        let lineM = '⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ 》'
        const opcion = readlineSync.question(`╭${lineM}  
┊ ${chalk.blueBright('╭┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')}
┊ ${chalk.blueBright('┊')} ${chalk.blue.bgBlue.bold.cyan('MÉTODO DE VINCULACIÓN')}
┊ ${chalk.blueBright('╰┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')}   
┊ ${chalk.blueBright('╭┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')}     
┊ ${chalk.blueBright('┊')} ${chalk.green.bgMagenta.bold.yellow('¿CÓMO DESEA CONECTARSE?')}
┊ ${chalk.blueBright('┊')} ${chalk.bold.redBright('⇢  Opción 1:')} ${chalk.greenBright('Código QR.')}
┊ ${chalk.blueBright('┊')} ${chalk.bold.redBright('⇢  Opción 2:')} ${chalk.greenBright('Código de 8 digitos.')}
┊ ${chalk.blueBright('╰┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')}
┊ ${chalk.blueBright('╭┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')}     
┊ ${chalk.blueBright('┊')} ${chalk.italic.magenta('Escriba sólo el número de')}
┊ ${chalk.blueBright('┊')} ${chalk.italic.magenta('la opción para conectarse.')}
┊ ${chalk.blueBright('╰┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')} 
╰${lineM}\n${chalk.bold.magentaBright('---> ')}`)
//readlineSync.question(chalk.yellow("Elige una opción (1 o 2): "));
        usarCodigo = opcion === "2";
        if (usarCodigo) {
            logInfo(chalk.yellow("Ingresa tu número (ej: +521234567890): "));
            numero = readlineSync.question("").replace(/[^0-9]/g, '');
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
    const authState = await useConfiguredAuthState({
        sessionId: 'main',
        sessionType: 'main',
        legacyFolder: BOT_SESSION_FOLDER,
    });
    const {state, saveCreds} = authState;
    const msgRetryCounterCache = new NodeCache({stdTTL: 0, checkperiod: 0});
    const userDevicesCache = new NodeCache({stdTTL: 0, checkperiod: 0});
    const groupCache = new NodeCache({stdTTL: 3600, checkperiod: 300});
    const messageCache = new BaileysMessageCache();
    const version = await getBaileysVersion();

    const sock = baileys.makeWASocket({
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
        cachedGroupMetadata: async (jid: string) => groupCache.get(jid),
        version: version,
        defaultQueryTimeoutMs: 30_000,
        keepAliveIntervalMs: 55000,
    });
    authState.leaseLost.addEventListener('abort', () => sock.end(new Error('Baileys auth lease perdido')), {once: true});

    const botSock = sock as BotSocket;
    botSock.groupCache = groupCache;
    setMainConnection(sock);
    registerContactUserSync(sock);
    setupGroupEvents(botSock);
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
            await authState.markConnected(sock.user?.id ?? null);
            logInfo(chalk.bold.greenBright('\n▣─────────────────────────────···\n│\n│❧ 𝙲𝙾𝙽𝙴𝙲𝚃𝙰𝙳𝙾 𝙲𝙾𝚁𝚁𝙴𝙲𝚃𝙰𝙼𝙴𝙽𝚃𝙴 𝙰𝙻 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿 ✅\n│\n▣─────────────────────────────···'));

            // Precarga de metadata de todos los grupos para evitar IQs lentos en el primer uso.
            void (async () => {
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    const entries = Object.entries(groups || {});
                    for (const [jid, meta] of entries) {
                        groupCache.set(jid, meta);
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
            messageCache.clear();
            if (SESSION_TERMINAL_CODES.includes(code)) {
                await authState.deleteSession();
                logError(chalk.red(`❌ Sesión inválida (código ${code}). Se eliminó del almacén activo; vuelve a vincular el bot.`));
                return;
            }
            logWarn(chalk.yellow(`♻️ Conexión cerrada (código ${code}). Reconexión con backoff programada.`));
            await authState.dispose();
            mainReconnect.schedule('main', startBot);
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

    sock.ev.on("messages.upsert", async ({messages, type}) => {
        if (type !== "notify") return;
        for (const msg of messages) {
            if (!msg.message) continue;
            messageCache.set(msg.key, msg.message);
            if (msg.messageTimestamp && (Date.now() / 1000 - Number(msg.messageTimestamp) > 120)) continue;
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
//const { callUpdate } = await import("./handler.js");
            for (const call of calls) {
                await callUpdate(sock, call);
            }
        } catch (err: unknown) {
            logError(chalk.red("❌ Error procesando call.update:"), err);
        }
    });

    function setupGroupEvents(sock: BotSocket) {
        sock.ev.on("group-participants.update", async (update) => {
            try {
                await participantsUpdate(sock, update);
            } catch (err: unknown) {
                logError(chalk.red("❌ Error procesando group-participants.update:"), err);
            }
        });

        sock.ev.on("groups.update", async (updates) => {
            try {
                for (const update of updates) {
                    if (!update.id) continue;
                    await groupsUpdate(sock, {...update, id: update.id});
                }
            } catch (err: unknown) {
                logError(chalk.red("❌ Error procesando groups.update:"), err);
            }
        });

        sock.ev.on("group.join-request", async (request) => {
            try {
                await groupJoinRequest(sock, request);
            } catch (err: unknown) {
                logError(chalk.red("❌ Error procesando group.join-request:"), err);
            }
        });
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
        if (running) return;
        running = true;
        void task().catch(logError).finally(() => { running = false; });
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

let shuttingDown = false;

async function shutdown(exitCode: number): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    mainReconnect.stop();
    stopSubbotReconnects();
    stopScheduledTasks();
    stopPluginWatchers();
    for (const timer of maintenanceTimers) clearInterval(timer);
    maintenanceTimers.clear();
    const sockets = [getMainConnection(), ...getSubbotConnections()].filter((socket): socket is baileys.WASocket => Boolean(socket));
    for (const socket of sockets) socket.end(new Error('Cierre controlado'));
    clearMainConnection();
    const drained = await drainBackgroundTasks(10_000);
    if (!drained) logWarn('⚠️ Cierre con tareas background pendientes tras 10 segundos.');
    const messagesDrained = await drainMessageQueue(10_000);
    if (!messagesDrained) logWarn('⚠️ Cierre con mensajes pendientes tras 10 segundos.');
    await flushAllDatabaseAuthStates().catch(error => logError('[AUTH] Error vaciando sesiones durante cierre:', error));
    await db.end().catch(error => logError('[DB] Error cerrando pool:', error));
    process.exit(exitCode);
}

