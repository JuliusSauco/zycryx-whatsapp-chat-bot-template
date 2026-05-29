import type {proto} from '@whiskeysockets/baileys';
import type {GroupSettings, Usuario} from './config.js';
import type {SendMessageOptions} from './context.js';

export interface MediaMessageLike {
    mimetype?: string;
    seconds?: number;
    caption?: string;
    url?: string;
    [key: string]: unknown;
}

export interface BotMessage extends proto.IWebMessageInfo {
    key: proto.IMessageKey;
    sender: string;
    chat: string;
    isGroup: boolean;
    isAdmin: boolean;
    isBotAdmin: boolean;
    fromMe: boolean;
    id: string;
    text: string;
    originalText: string;
    who: string;
    pp: string;
    lid: string;
    exp?: number;
    seconds?: number;
    msg?: MediaMessageLike;
    mediaType?: string;
    mimetype?: string;
    mentionedJid: string[];

    user: Partial<Usuario> & { id?: string; lid?: string };
    chatDB: Partial<GroupSettings>;

    quoted?: {
        key: proto.IMessageKey;
        message: proto.IMessage;
        messageTimestamp?: number | Long | null;
        participant?: string;
        sender: string;
        chat: string;
        id?: string;
        fromMe?: boolean;
        text?: string;
        msg?: MediaMessageLike;
        mediaType?: string;
        seconds?: number;
        mimetype?: string;
        download: () => Promise<Buffer>;
    };

    reply: (text: string, chatIdOrOptions?: string | null | SendMessageOptions, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    react: (emoji: string) => Promise<void>;
    download: () => Promise<Buffer>;
}
