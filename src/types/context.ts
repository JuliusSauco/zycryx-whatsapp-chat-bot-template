import type {AnyMessageContent, GroupMetadata, GroupParticipant, MiscMessageGenerationOptions, proto, WASocket} from '@whiskeysockets/baileys';
import type {BotMessage} from './message.js';

export type MessageContent = AnyMessageContent | Record<string, unknown>;
export type QuotedMessage = BotMessage | proto.IWebMessageInfo | string | null | undefined;
export type SendMessageOptions = Omit<MiscMessageGenerationOptions, 'quoted'> & {quoted?: QuotedMessage} & Record<string, unknown>;
export type MediaInput = string | string[] | Buffer | Uint8Array | ArrayBuffer | {url: string} | null | undefined;
export interface FileInfo {
    data?: Buffer;
    filename?: string;
    ext?: string;
    mime?: string;
    [key: string]: unknown;
}

/**
 * Conn extendido con métodos custom agregados en simple.ts.
 * WASocket base + reply, sendFile, fakeReply, parseMention, etc.
 */
export type ExtendedConn = Omit<WASocket, 'sendMessage'> & {
    sendMessage: (jid: string, content: MessageContent, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    reply: (chatId: string, text: string, quotedOrOptions?: QuotedMessage | SendMessageOptions, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    sendFile: (jid: string, path: MediaInput, filename?: string, caption?: string, quoted?: QuotedMessage, ptt?: boolean, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    fakeReply: (jid: string, caption?: string, fakeNumber?: string, fakeCaption?: string, quoted?: QuotedMessage, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    parseMention: (text: string) => Promise<string[]>;
    sendImage: (jid: string, path: MediaInput, caption?: string, quoted?: QuotedMessage, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    sendVideo: (jid: string, path: MediaInput, caption?: string, quoted?: QuotedMessage, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    sendAudio: (jid: string, path: MediaInput, quoted?: QuotedMessage, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    sendSticker: (jid: string, path: MediaInput, quoted?: QuotedMessage, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    sendPtt: (jid: string, path: MediaInput, quoted?: QuotedMessage, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    sendDocument: (jid: string, path: MediaInput, filename?: string, quoted?: QuotedMessage, options?: SendMessageOptions) => Promise<proto.WebMessageInfo>;
    sendAlbumMessage: (jid: string, medias?: MessageContent[], caption?: string, quoted?: QuotedMessage) => Promise<proto.WebMessageInfo>;
    getName: (jid: string, withoutContact?: boolean, m?: BotMessage) => Promise<string | null>;
    decodeJid: (jid: string) => string;
    groupCache?: {
        get: (key: string) => GroupMetadata | undefined;
        set: (key: string, value: GroupMetadata) => void;
    };
    chats?: Record<string, {messages?: Record<string, unknown>}>;
    getFile?: (input: MediaInput) => Promise<FileInfo>;
    __zycryxSendMessageWrapped?: boolean;
    [key: string]: unknown;
};

export interface PluginContext {
    conn: ExtendedConn;
    text: string;
    args: string[];
    usedPrefix: string;
    command: string;
    participants: GroupParticipant[];
    metadata: GroupMetadata;
    isOwner: boolean;
    isROwner: boolean;
    isAdmin: boolean;
    isBotAdmin: boolean;
    isGroup: boolean;
}
