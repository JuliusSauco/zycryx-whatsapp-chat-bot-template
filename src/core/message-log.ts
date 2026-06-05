import {logError} from '../lib/logger.js';
import {incrementMessageCount, logGroupMessage} from '../services/chat.service.js';
import type {BotMessage} from '../types/message.js';
import type {HandlerContext} from './context-builder.js';

export function trackMessageCount(ctx: {
    chatId: string;
    sender: string;
    botJid: string;
    isGroup: boolean;
    isAdmin: boolean
}): void {
    // Solo se cuentan mensajes de integrantes normales:
    // se ignoran los chats privados, el propio bot y los administradores del grupo.
    if (!ctx.isGroup) return;
    if (ctx.sender === ctx.botJid) return;
    if (ctx.isAdmin) return;

    incrementMessageCount(ctx.sender, ctx.chatId).catch(logError);
}

export function trackGroupMessageLog(m: BotMessage, ctx: Pick<HandlerContext, 'chatId' | 'sender' | 'botJid' | 'isGroup' | 'groupSettings'>): void {
    if (!ctx.isGroup) return;
    if (!ctx.groupSettings?.message_logging) return;
    if (ctx.sender === ctx.botJid) return;

    const entry = buildMessageLogEntry(m);
    if (!entry) return;

    logGroupMessage({
        groupId: ctx.chatId,
        userId: ctx.sender,
        messageId: m.key?.id || m.id || `${Date.now()}-${ctx.sender}`,
        messageText: entry.text,
        messageType: entry.type,
        isReply: entry.isReply,
        replyToMessageId: entry.replyToMessageId,
    }).catch(logError);
}

function buildMessageLogEntry(m: BotMessage): {
    text: string;
    type: 'text' | 'multimedia';
    isReply: boolean;
    replyToMessageId: string | null;
} | null {
    const content = unwrapMessageContent(m.message);
    if (!content) return null;
    return buildMessageLogEntryFromContent(content);
}

function buildMessageLogEntryFromContent(content: Record<string, unknown>): {
    text: string;
    type: 'text' | 'multimedia';
    isReply: boolean;
    replyToMessageId: string | null;
} | null {
    const replyToMessageId = getReplyToMessageId(content);
    const replyInfo = {
        isReply: !!replyToMessageId,
        replyToMessageId,
    };

    const mediaTypes = [
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'documentMessage',
        'documentWithCaptionMessage',
        'stickerMessage',
        'ptvMessage',
    ];
    if (mediaTypes.some(type => Object.prototype.hasOwnProperty.call(content, type))) {
        return {text: 'Multimedia omitido.', type: 'multimedia', ...replyInfo};
    }

    const text =
        getNestedText(content, 'conversation') ||
        getNestedText(content, 'extendedTextMessage', 'text');
    const trimmed = text.trim();
    if (!trimmed) return null;

    return {text: trimmed, type: 'text', ...replyInfo};
}

function unwrapMessageContent(message: BotMessage['message']): Record<string, unknown> | null {
    const content = message as Record<string, unknown> | null | undefined;
    if (!content) return null;

    const wrapperKeys = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2'];
    for (const key of wrapperKeys) {
        const wrapper = content[key] as {message?: unknown} | undefined;
        if (wrapper?.message && typeof wrapper.message === 'object') {
            return unwrapMessageContent(wrapper.message as BotMessage['message']);
        }
    }

    return content;
}

function getNestedText(content: Record<string, unknown>, ...path: string[]): string {
    let current: unknown = content;
    for (const key of path) {
        if (!current || typeof current !== 'object') return '';
        current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'string' ? current : '';
}

function getReplyToMessageId(content: Record<string, unknown>): string | null {
    for (const value of Object.values(content)) {
        if (!value || typeof value !== 'object') continue;
        const contextInfo = (value as {contextInfo?: {stanzaId?: unknown}}).contextInfo;
        if (typeof contextInfo?.stanzaId === 'string' && contextInfo.stanzaId.trim()) {
            return contextInfo.stanzaId.trim();
        }
    }

    return null;
}
