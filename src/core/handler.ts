import "./config.js";
import chalk from "chalk";
import {logCommand, logError} from '../lib/logger.js';
import {enqueueBackgroundTask} from '../lib/background-task-queue.js';
import {sanitizeCommandError} from '../lib/sensitive-command.js';
import {smsg} from "../lib/simple.js";
import {parseMessage} from './message-parser.js';
import {buildContext} from './context-builder.js';
import {getEventGroupSettings} from './group-event-settings.js';
import {isDuplicateMessage} from './message-dedup.js';
import {trackGroupMessageLog, trackMessageCount} from './message-log.js';
import {logPerfIfSlow, markPerf, type PerfDetail, type PerfMarks} from './performance-logger.js';
import {router} from './router.js';
import {runGuards} from '../guards/index.js';
import {
    appendCommandInfoHint, buildInlineHelpQuery, isInlineHelpRequest, renderCommandHelp,
} from '../services/command-help.service.js';
import {cleanJid, isUserJid, jidToPhone, resolveSenderInfo} from '../utils/jid.js';
import {isBlockedPhoneNumber, MESSAGE_DEDUP_TTL} from '../utils/constants.js';
import {
    upsertActiveChat,
} from '../services/chat.service.js';
import {upsertUser as upsertUserService} from '../services/user.service.js';
import {incrementCommandUsage} from '../services/stats.service.js';
import {
    commandResourceChargeMessage,
    commandResourceDecisionMessage,
    commitCommandResources,
    releaseCommandResources,
    reserveCommandResources,
} from '../services/resource.service.js';
import type {CommandResourceReservation} from '../domain/command-resources.js';
import {executePluginWithTimeout, PluginTimeoutError} from './plugin-execution.js';
import {runPluginInterceptors} from './plugin-interceptors.js';
import type {ExtendedConn} from '../types/context.js';
import {requireBotInstanceIdentity} from './bot-instance-identity.js';
import {linkToApplicationShutdown} from './application-lifecycle.js';
import type {BotMessage} from '../types/message.js';
import type {HandlerContext} from './context-builder.js';

export {groupJoinRequest, groupsUpdate, participantsUpdate} from './group-events.js';
export {callUpdate} from './call-events.js';
export {messageUpdate} from './message-update.js';

export async function handler(conn: ExtendedConn, m: BotMessage) {
    const perfStart = performance.now();
    const marks: PerfMarks = {};
    const perfDetails: PerfDetail[] = [];
    const chatId = m.key?.remoteJid || "";

    // 1. Dedup
    if (await isDuplicateMessage(m, MESSAGE_DEDUP_TTL)) return;
    markPerf(marks, 'dedup', perfStart);

    if (shouldSkipMessage(m, chatId)) return;
    markPerf(marks, 'skip', perfStart);

    // 2. Setup reply helper + smsg (enriquece m con .db, .quoted, .download, etc.)
    m.reply = async (text, chatIdOrOptions, options = {}) => {
        const targetChatId = typeof chatIdOrOptions === 'string' ? chatIdOrOptions : chatId;
        const firstOptions = chatIdOrOptions && typeof chatIdOrOptions === 'object' ? chatIdOrOptions : {};
        const mergedOptions = {...firstOptions, ...options};
        const explicitMentions = Array.isArray(mergedOptions.mentions)
            ? mergedOptions.mentions.filter((jid): jid is string => typeof jid === 'string')
            : [];
        const parsedMentions = await conn.parseMention(text);
        const customContextInfo = mergedOptions.contextInfo && typeof mergedOptions.contextInfo === 'object'
            ? mergedOptions.contextInfo
            : {};
        const contextInfo = {
            ...customContextInfo,
            mentionedJid: [...new Set([...parsedMentions, ...explicitMentions])],
        };
        const {mentions: _mentions, contextInfo: _contextInfo, quoted, ...sendOptions} = mergedOptions;
        return await conn.sendMessage(targetChatId, {text, contextInfo}, {quoted: quoted || m, ...sendOptions});
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
    trackMessageCount(ctx);
    trackGroupMessageLog(m, ctx);

    // 6. Antifake check
    if (await antifakeCheck(conn, m, ctx)) return;

    // 7. Upsert user data (fire-and-forget — m.sender/m.lid ya resueltos en buildContext)
    enqueueBackgroundTask('upsert-user', () => upsertUser(m), {key: `upsert-user:${ctx.sender}`, maxRetries: 1});

    // 8. Parse message (antes de before hooks para que m.originalText y m.text estén disponibles)
    const prefixes = Array.isArray(ctx.botConfig.prefix) ? ctx.botConfig.prefix : [ctx.botConfig.prefix];
    const parsed = parseMessage(m, prefixes);
    m.originalText = parsed.originalText;
    m.text = parsed.text;
    markPerf(marks, 'parse', perfStart);

    // 9. Run before hooks
    const isPrefixedCommand = !!parsed.usedPrefix && !!parsed.command;
    const beforePlugins = router.getBeforePluginsFor(isPrefixedCommand);
    const hookGroupSettings = ctx.isGroup ? ctx.groupSettings : {};
    const interceptorContext = {
        conn,
        isOwner: ctx.isOwner,
        isAdmin: ctx.isAdmin,
        isGroupCreator: ctx.isGroupCreator,
        isBotAdmin: ctx.isBotAdmin,
        isGroup: ctx.isGroup,
        chatId: ctx.chatId,
        sender: ctx.sender,
        participants: ctx.participants,
        metadata: ctx.metadata,
        botConfig: ctx.botConfig,
        branding: ctx.branding,
        groupSettings: hookGroupSettings,
    };
    const interceptorResult = await runPluginInterceptors({
        plugins: beforePlugins,
        message: m,
        isCommand: isPrefixedCommand,
        context: interceptorContext,
        onDuration: (label, start) => addPerfDetail(perfDetails, label, start),
    });
    if (interceptorResult.rejectionMessage) await m.reply(interceptorResult.rejectionMessage);
    if (interceptorResult.handled) {
        markPerf(marks, 'before', perfStart);
        logPerfIfSlow(marks, perfStart, parsed.command || 'interceptor-abort', chatId, perfDetails);
        return;
    }
    markPerf(marks, 'before', perfStart);

    // 10. Route command
    const plugin = router.resolve(parsed.command, parsed.originalText, !!parsed.usedPrefix);
    if (!plugin) {
        if (parsed.usedPrefix && parsed.command) {
            await m.reply(renderCommandHelp({query: parsed.command, usedPrefix: parsed.usedPrefix}));
        }
        logPerfIfSlow(marks, perfStart, parsed.command || 'no-command', chatId, perfDetails);
        return;
    }

    if (isInlineHelpRequest(parsed.args)) {
        await m.reply(renderCommandHelp({
            query: buildInlineHelpQuery(parsed.command, parsed.text),
            usedPrefix: parsed.usedPrefix,
            plugin,
        }));
        markPerf(marks, 'help', perfStart);
        logPerfIfSlow(marks, perfStart, `${parsed.command}:help`, chatId, perfDetails);
        return;
    }

    // 11. Run guards
    const guardResult = await runGuards({m, conn, ctx, plugin});
    markPerf(marks, 'guards', perfStart);
    if (guardResult.silent) return;
    if (guardResult.error) {
        await m.reply(guardResult.error);
        markPerf(marks, 'guardReply', perfStart);
        logPerfIfSlow(marks, perfStart, parsed.command, chatId, perfDetails);
        return;
    }

    // 12. Execute plugin
    const pluginStart = performance.now();
    let resourceReservation: CommandResourceReservation | null = null;
    try {
        const pluginGroupSettings = ctx.isGroup && plugin.needsFullGroupSettings
            ? await getEventGroupSettings(ctx.chatId)
            : hookGroupSettings;

        const pluginId = plugin.manifest?.id ?? getPluginLogName(plugin);
        const correlationId = m.key.id || `${ctx.chatId}:${Date.now()}`;
        const resourceDecision = await reserveCommandResources({
            sender: ctx.sender,
            plugin,
            pluginId,
            messageId: m.key.id || `${ctx.chatId}:${parsed.command}`,
        });
        const resourceError = commandResourceDecisionMessage(resourceDecision);
        if (resourceError) {
            await m.reply(resourceError);
            return;
        }
        if (resourceDecision.kind === 'reserved') {
            if (resourceDecision.duplicate) return;
            resourceReservation = resourceDecision.reservation;
        }

        logCommand({
            conn,
            sender: ctx.sender,
            chatId: ctx.chatId,
            isGroup: ctx.isGroup,
            command: parsed.command,
            pluginId,
            correlationId,
            timestamp: new Date()
        });

        const controller = new AbortController();
        const unlinkShutdown = linkToApplicationShutdown(controller);
        const originalReply = m.reply;
        m.reply = (message, options, sendOptions) => originalReply.call(
            m,
            appendCommandInfoHint(message, parsed.usedPrefix, parsed.command),
            options,
            sendOptions,
        );
        try {
            await executePluginWithTimeout({
                plugin,
                pluginId,
                controller,
                execute: () => plugin(m, {
                conn,
                text: parsed.text,
                args: parsed.args,
                usedPrefix: parsed.usedPrefix,
                command: parsed.command,
                participants: ctx.participants,
                metadata: ctx.metadata,
                isOwner: ctx.isOwner,
                isAdmin: ctx.isAdmin,
                isGroupCreator: ctx.isGroupCreator,
                isBotAdmin: ctx.isBotAdmin,
                isGroup: ctx.isGroup,
                botConfig: ctx.botConfig,
                branding: ctx.branding,
                chatId: ctx.chatId,
                sender: ctx.sender,
                groupSettings: pluginGroupSettings,
                pluginId,
                correlationId,
                signal: controller.signal,
                }),
            });
        } finally {
            m.reply = originalReply;
            unlinkShutdown();
        }
        if (resourceReservation) {
            await commitCommandResources(resourceReservation);
            const chargeMessage = commandResourceChargeMessage(resourceReservation);
            if (chargeMessage) await m.reply(chargeMessage);
        }
        await runPluginInterceptors({
            plugins: router.getBeforePlugins(),
            message: m,
            isCommand: true,
            context: interceptorContext,
            phases: ['post'],
            onDuration: (label, start) => addPerfDetail(perfDetails, label, start),
        });
        addPerfDetail(perfDetails, `plugin:${getPluginLogName(plugin)}`, pluginStart);

        incrementCommandUsage(parsed.command);
        markPerf(marks, 'plugin', perfStart);
        logPerfIfSlow(marks, perfStart, parsed.command, chatId, perfDetails);

    } catch (e: unknown) {
        if (resourceReservation) {
            try {
                await releaseCommandResources(resourceReservation, e instanceof PluginTimeoutError ? 'timeout' : 'execution_error');
            } catch (releaseError: unknown) {
                logError('No se pudo liberar la reserva del comando:', releaseError);
            }
        }
        addPerfDetail(perfDetails, `plugin:${getPluginLogName(plugin)}`, pluginStart);
        markPerf(marks, 'plugin', perfStart);
        logPerfIfSlow(marks, perfStart, parsed.command, chatId, perfDetails);
        if (typeof e === 'string') {
            await m.reply(e);
            return;
        }
        // El log conserva el error completo; al usuario solo se le muestra una
        // versión sanitizada y truncada para no filtrar detalles internos.
        logError(chalk.red(`❌ Error al ejecutar ${parsed.command}:`), e);
        await m.reply("❌ Error ejecutando el comando, reporte este error a mi creador con el comando: /report\n\n" + sanitizeCommandError(e));
    }
}

// ---- Helpers privados del handler ----

function upsertChat(chatId: string, conn: ExtendedConn): void {
    const identity = requireBotInstanceIdentity(conn);
    enqueueBackgroundTask('upsert-active-chat', () => upsertActiveChat({
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        timestamp: Date.now(),
        botId: identity.instanceId,
    }), {key: `upsert-active-chat:${chatId}`, maxRetries: 1});
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

        await upsertUserService({id: m.sender, nombre: userName, username: info.username, num, lid: m.lid});
    } catch (err: unknown) {
        logError(err);
    }
}

function addPerfDetail(details: PerfDetail[], label: string, start: number): void {
    details.push({label, ms: Math.round(performance.now() - start)});
}

function getPluginLogName(plugin: {__name?: string}): string {
    return plugin.__name?.replace(/\.(js|ts)$/i, '') || 'anonymous';
}

function shouldSkipMessage(m: BotMessage, chatId: string): boolean {
    if (!chatId) return true;
    if (chatId === 'status@broadcast' || chatId.endsWith('@newsletter')) return true;
    if (!m.message) return true;

    const messageKeys = Object.keys(m.message);
    if (!messageKeys.length) return true;

    return messageKeys.every((key) => PASSIVE_IGNORED_MESSAGE_TYPES.has(key));
}

const PASSIVE_IGNORED_MESSAGE_TYPES = new Set([
    'messageContextInfo',
    'protocolMessage',
    'reactionMessage',
    'senderKeyDistributionMessage',
]);

