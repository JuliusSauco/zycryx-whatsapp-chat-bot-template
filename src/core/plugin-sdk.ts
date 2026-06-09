import type {proto} from '@whiskeysockets/baileys';
import {definePlugin, type PluginDefinition} from './define-plugin.js';
import {
    httpBuffer,
    httpJson,
    httpRequest,
    httpText,
    type HttpRequestOptions,
} from '../lib/http-client.js';
import {type Provider, runFirstProvider} from '../lib/provider-fallback.js';
import {
    errorMessage,
    failure,
    reportableError,
    success,
    usage,
    userError,
} from '../lib/reply-helpers.js';
import {createUserRequestLocks, type UserRequestLocks} from '../lib/user-request-locks.js';
import {
    content,
    getMessage,
    getMessageList,
    getMessageObjectList,
    renderMessage,
    renderTemplate,
    type MessageTemplateValue,
} from '../services/content.service.js';
import type {PluginContext, QuotedMessage, SendMessageOptions} from '../types/context.js';
import type {BotMessage} from '../types/message.js';
import type {Plugin} from '../types/plugin.js';

type ReplyOptions = string | null | SendMessageOptions;

export interface PluginReplySdk {
    text(text: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    message(path: string, values?: Record<string, MessageTemplateValue>, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    userError(message: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    success(message: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    failure(message: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    usage(commandExample: string, details?: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    reportableError(error: unknown, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    react(emoji: string): Promise<void>;
}

export interface PluginContentSdk {
    message: typeof getMessage;
    messageList: typeof getMessageList;
    messageObjectList: typeof getMessageObjectList;
    renderMessage: typeof renderMessage;
    renderTemplate: typeof renderTemplate;
}

export interface PluginProviderSdk {
    runFirst<T>(providers: Provider<T>[], errorMessage: string): Promise<T>;
}

export interface PluginHttpSdk {
    request: typeof httpRequest;
    json: typeof httpJson;
    text: typeof httpText;
    buffer: typeof httpBuffer;
}

export interface PluginSdk {
    readonly m: BotMessage;
    readonly ctx: PluginContext;
    readonly conn: PluginContext['conn'];
    readonly chatId: string;
    readonly sender: string;
    readonly command: string;
    readonly text: string;
    readonly args: string[];
    readonly usedPrefix: string;
    readonly isGroup: boolean;
    readonly isOwner: boolean;
    readonly isAdmin: boolean;
    readonly isBotAdmin: boolean;
    readonly groupSettings: PluginContext['groupSettings'];
    readonly metadata: PluginContext['metadata'];
    readonly participants: PluginContext['participants'];
    readonly content: PluginContentSdk;
    readonly reply: PluginReplySdk;
    readonly providers: PluginProviderSdk;
    readonly http: PluginHttpSdk;
    createUserLocks<TPayload = true>(): UserRequestLocks<TPayload>;
    sendMessage(content: Parameters<PluginContext['conn']['sendMessage']>[1], options?: SendMessageOptions): Promise<proto.WebMessageInfo>;
    sendFile(path: Parameters<PluginContext['conn']['sendFile']>[1], filename?: string, caption?: string, quoted?: QuotedMessage, ptt?: boolean, options?: SendMessageOptions): Promise<proto.WebMessageInfo>;
}

export type SdkPluginContext = PluginContext & {sdk: PluginSdk};
export type SdkPluginDefinition = Omit<PluginDefinition, 'execute'> & {
    execute: (m: BotMessage, ctx: SdkPluginContext) => Promise<unknown>;
};

export function defineSdkPlugin(def: SdkPluginDefinition): Plugin {
    return definePlugin({
        ...def,
        execute: (m, ctx) => def.execute(m, {...ctx, sdk: createPluginSdk(m, ctx)}),
    });
}

export function createPluginSdk(m: BotMessage, ctx: PluginContext): PluginSdk {
    const chatId = ctx.chatId || m.chat;
    const sender = ctx.sender || m.sender;

    return {
        m,
        ctx,
        conn: ctx.conn,
        chatId,
        sender,
        command: ctx.command,
        text: ctx.text,
        args: ctx.args,
        usedPrefix: ctx.usedPrefix,
        isGroup: ctx.isGroup,
        isOwner: ctx.isOwner,
        isAdmin: ctx.isAdmin,
        isBotAdmin: ctx.isBotAdmin,
        groupSettings: ctx.groupSettings,
        metadata: ctx.metadata,
        participants: ctx.participants,
        content,
        reply: createReplySdk(m),
        providers: {
            runFirst: runFirstProvider,
        },
        http: {
            request: httpRequest,
            json: httpJson,
            text: httpText,
            buffer: httpBuffer,
        },
        createUserLocks: createUserRequestLocks,
        sendMessage(messageContent, options) {
            return ctx.conn.sendMessage(chatId, messageContent, {quoted: m, ...options});
        },
        sendFile(path, filename, caption, quoted = m, ptt, options) {
            return ctx.conn.sendFile(chatId, path, filename, caption, quoted, ptt, options);
        },
    };
}

function createReplySdk(m: BotMessage): PluginReplySdk {
    return {
        text(text, options, sendOptions) {
            return m.reply(text, options, sendOptions);
        },
        message(path, values = {}, options, sendOptions) {
            return m.reply(renderMessage(path, values), options, sendOptions);
        },
        userError(message, options, sendOptions) {
            return m.reply(userError(message), options, sendOptions);
        },
        success(message, options, sendOptions) {
            return m.reply(success(message), options, sendOptions);
        },
        failure(message, options, sendOptions) {
            return m.reply(failure(message), options, sendOptions);
        },
        usage(commandExample, details, options, sendOptions) {
            return m.reply(usage(commandExample, details), options, sendOptions);
        },
        reportableError(error, options, sendOptions) {
            return m.reply(reportableError(error), options, sendOptions);
        },
        react(emoji) {
            return m.react(emoji);
        },
    };
}

export {errorMessage};
