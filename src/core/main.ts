import * as baileys from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import readlineSync from "readline-sync";
import pino from "pino";
import type {Logger} from "pino";
import NodeCache from 'node-cache';
import {startSubBot} from "../lib/subbot.js";
import "./config.js";
import {callUpdate, groupJoinRequest, groupsUpdate, handler, messageUpdate, participantsUpdate} from "./handler.js";
import {loadPlugins} from '../lib/plugins.js';
import {isOtherBotKey} from '../utils/message-filter.js';
import {startScheduledTasks} from './scheduled-tasks.js';
import {logDebug, logError, logInfo, logWarn} from '../lib/logger.js';
import type {ExtendedConn} from '../types/context.js';
import type {BotMessage} from '../types/message.js';

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
if (!fs.existsSync(BOT_SESSION_FOLDER)) fs.mkdirSync(BOT_SESSION_FOLDER);

if (!globalThis.conns || !(globalThis.conns instanceof Array)) globalThis.conns = [];
const reconectando = new Set();
let usarCodigo = false;
let numero = "";
const chatQueues = new Map<string, Promise<void>>();

// --- Detector de spam de "ekey bundle" ---
let spamCount = 0;

setInterval(() => {
    spamCount = 0
}, 60 * 1000);

const origError = console.error;
console.error = (...args) => {
    if (args[0]?.toString().includes("Closing stale open session")) {
        spamCount++;
        if (spamCount > 50) {
            logWarn("⚠️ Detectado loop de sesiones, reiniciando bot...");
            process.exit(1);
        }
    }
    origError(...args);
};

main();

async function main() {
    const hayCredencialesPrincipal = fs.existsSync(BOT_CREDS_PATH);
    const subbotsFolder = "./jadibot";
    const haySubbotsActivos = fs.existsSync(subbotsFolder) && fs.readdirSync(subbotsFolder).some(folder => fs.existsSync(path.join(subbotsFolder, folder, "creds.json"))
    );

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
    if (!fs.existsSync(folder)) return;

    const subbotIds = fs.readdirSync(folder);
//logInfo(chalk.bold.yellowBright(`📦 Subbots cargados: ${subbotIds.length}`));

    for (const userId of subbotIds) {
        const sessionPath = path.join(folder, userId);
        const credsPath = path.join(sessionPath, "creds.json");
        if (!fs.existsSync(credsPath)) continue;
        if (globalThis.conns?.some(conn => conn.userId === userId)) continue;
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
    setTimeout(cargarSubbots, 60 * 1000);
}

async function startBot() {
    const {state, saveCreds} = await baileys.useMultiFileAuthState(BOT_SESSION_FOLDER);
    const msgRetryCounterCache = new NodeCache({stdTTL: 0, checkperiod: 0});
    const userDevicesCache = new NodeCache({stdTTL: 0, checkperiod: 0});
    const groupCache = new NodeCache({stdTTL: 3600, checkperiod: 300});
    const {version} = await baileys.fetchLatestBaileysVersion();

    console.info = () => {
    };
    console.debug = () => {
    };
    const sock = baileys.makeWASocket({
        printQRInTerminal: !usarCodigo && !fs.existsSync(BOT_CREDS_PATH),
        logger: createPino({level: 'silent'}),
        browser: ['Windows', 'Chrome', ''] as [string, string, string],
        auth: {
            creds: state.creds,
            keys: baileys.makeCacheableSignalKeyStore(state.keys, createPino({level: 'silent'}))
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => undefined,
        msgRetryCounterCache: msgRetryCounterCache,
        userDevicesCache: userDevicesCache as unknown as SocketConfig['userDevicesCache'],
        cachedGroupMetadata: async (jid: string) => groupCache.get(jid),
        version: version,
        defaultQueryTimeoutMs: 30_000,
        keepAliveIntervalMs: 55000,
    });

    const botSock = sock as BotSocket;
    botSock.groupCache = groupCache;
    globalThis.conn = sock;
    setupGroupEvents(botSock);
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({connection, lastDisconnect}) => {
        const code = (lastDisconnect?.error as DisconnectErrorLike | undefined)?.output?.statusCode || 0;

        if (connection === "open") {
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
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    logWarn(chalk.yellow("⚠️ No se pudo precargar metadata de grupos:"), message);
                }
            })();
        }

        if (connection === "close") {
            if ([401, 440, 428, 405].includes(code)) {
                logError(chalk.red(`❌ Error de sesión (${code}) inválida. Borra la carpeta "BotSession" y vuelve a conectar.`));
            }
            logWarn(chalk.yellow("♻️ Conexión cerrada. Reintentando en 3s..."));
            setTimeout(() => startBot(), 3000);
        }
    });

    process.on('uncaughtException', logError);
    process.on('unhandledRejection', logError);

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
            if (msg.messageTimestamp && (Date.now() / 1000 - Number(msg.messageTimestamp) > 120)) continue;
            if (isOtherBotKey(msg.key.id)) continue;
            enqueueMessage(sock, msg);
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

//tmp    
    setInterval(() => {
        const tmp = './tmp';
        try {
            if (!fs.existsSync(tmp)) return;
            const files = fs.readdirSync(tmp);
            files.forEach(file => {
                if (file.endsWith('.file')) return;
                const filePath = path.join(tmp, file);
                const stats = fs.statSync(filePath);
                const now = Date.now();
                const modifiedTime = new Date(stats.mtime).getTime();
                const age = now - modifiedTime;
                if (age > 3 * 60 * 1000) {
                    fs.unlinkSync(filePath);
                }
            })
//logInfo(chalk.gray(`┏━━━━━━⪻♻️ AUTO-CLEAR 🗑️⪼━━━━━━•\n┃→ ARCHIVOS DE LA CARPETA TMP ELIMINADOS\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━•`));
        } catch (err: unknown) {
            logError('Error cleaning temporary files:', err);
        }
    }, 30 * 1000);

    setInterval(() => {
        logWarn('♻️ Reiniciando bot automáticamente...');
        process.exit(0);
    }, 10800000) //3hs
//3600000

//tmp session basura
    setInterval(() => {
        const now = Date.now();
        const carpetas = ['./jadibot', './BotSession'];
        for (const basePath of carpetas) {
            if (!fs.existsSync(basePath)) continue;

            const subfolders = fs.readdirSync(basePath);
            for (const folder of subfolders) {
                const sessionPath = path.join(basePath, folder);
                if (!fs.statSync(sessionPath).isDirectory()) continue;
                const isActive = globalThis.conns?.some(c => c.userId === folder || c.user?.id?.includes(folder));
                const files = fs.readdirSync(sessionPath);

                // 🔧 limitar cantidad de pre-keys
                const prekeys = files.filter(f => f.startsWith("pre-key"));
                if (prekeys.length > 500) {
                    prekeys
                        .sort((a, b) => fs.statSync(path.join(sessionPath, a)).mtimeMs - fs.statSync(path.join(sessionPath, b)).mtimeMs)
                        .slice(0, prekeys.length - 300)
                        .forEach(pk => {
                            fs.unlinkSync(path.join(sessionPath, pk));
                        });
                }

                for (const file of files) {
                    const fullPath = path.join(sessionPath, file);
                    if (!fs.existsSync(fullPath)) continue;
                    if (file === 'creds.json') continue;
                    try {
                        const stats = fs.statSync(fullPath);
                        const ageMs = now - stats.mtimeMs;

                        if (file.startsWith('pre-key') && ageMs > 24 * 60 * 60 * 1000 && !isActive) {
                            fs.unlinkSync(fullPath);
                        } else if (ageMs > 30 * 60 * 1000 && !isActive) {
                            fs.unlinkSync(fullPath);
                        }
                    } catch (err: unknown) {
                        logError(chalk.red(`[⚠] Error al limpiar archivo ${file}:`), err);
                    }
                }
            }
        }
        logDebug(chalk.bold.cyanBright(`\n╭» 🟠 ARCHIVOS 🟠\n│→ Sesiones y pre-keys viejas limpiadas\n╰―――――――――――――――――――――――――――――― 🗑️♻️`));
    }, 10 * 60 * 1000); // cada 10 minutos

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

function enqueueMessage(sock: baileys.WASocket, msg: baileys.WAMessage): void {
    const chatId = msg.key?.remoteJid || msg.key?.participant || 'unknown';
    const previous = chatQueues.get(chatId) || Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(async () => {
            try {
                await handler(sock as unknown as ExtendedConn, msg as unknown as BotMessage);
            } catch (err: unknown) {
                logError(err);
            }
        });

    chatQueues.set(chatId, current);
    current.finally(() => {
        if (chatQueues.get(chatId) === current) chatQueues.delete(chatId);
    });
}

