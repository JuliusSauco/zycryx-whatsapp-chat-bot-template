import {logError} from './logger.js';
import * as baileys from "@whiskeysockets/baileys";
import {fileTypeFromBuffer} from 'file-type'
import {httpBuffer} from './http-client.js';
import type {BotMessage} from '../types/message.js';
import type {ExtendedConn, MediaInput, MessageContent, QuotedMessage, SendMessageOptions} from '../types/context.js';
import {getUserName} from '../services/user.service.js';
import {installLegacyArrayRandom} from './legacy-array-random.js';

const {
    downloadMediaMessage,
    downloadContentFromMessage,
    generateWAMessage,
    generateWAMessageFromContent,
} = baileys;

const DEFAULT_PROFILE_PICTURE_URL = 'https://telegra.ph/file/33bed21a0eaa789852c30.jpg';

type MessageRecord = Record<string, unknown>;
type FileTypeResult = {ext?: string; mime?: string};
type ExternalAdReplyLike = {
    thumbnail?: unknown;
    thumbnailUrl?: unknown;
    [key: string]: unknown;
};
type ContextInfoLike = {
    externalAdReply?: ExternalAdReplyLike;
    [key: string]: unknown;
};
type AlbumMedia = {
    type: 'image' | 'video';
    data: unknown;
};
type GeneratedMessageWithContext = baileys.WAMessage & {
    message: baileys.WAMessage['message'] & {
        messageContextInfo?: unknown;
    };
};
type AsyncIterableStream = AsyncIterable<Buffer | Uint8Array>;
type BaileysMessageContent = Parameters<typeof generateWAMessage>[1];
type BaileysMessageOptions = Parameters<typeof generateWAMessage>[2];

function getContextInfo(options: SendMessageOptions): ContextInfoLike | undefined {
    return options.contextInfo as ContextInfoLike | undefined;
}

export async function smsg(conn: ExtendedConn, m: BotMessage): Promise<BotMessage> {
    if (!m) return m;

    if (!m.mentionedJid) m.mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    if (!m.quoted && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const ctx = m.message.extendedTextMessage.contextInfo;
        const quotedMessage = {
            key: {
                id: ctx.stanzaId,
                fromMe: ctx.participant === conn.user?.id,
                remoteJid: m.chat,
                participant: ctx.participant || undefined,
            },
            message: ctx.quotedMessage || {},
            messageTimestamp: m.messageTimestamp,
            participant: ctx.participant || undefined,
            sender: ctx.participant || '',
            chat: m.chat,
        };
        m.quoted = {
            ...quotedMessage,
            download: () => downloadMediaMessage(quotedMessage as baileys.WAMessage, 'buffer', {}),
        };
    }

    m.user = m.user || {};
    m.chatDB = m.chatDB || {};

    if (m.quoted && m.quoted.message && typeof m.quoted.message === 'object') {
            const keys = Object.keys(m.quoted.message);
        if (keys.length > 0) {
            const type = keys[0];
            const media = (m.quoted.message as MessageRecord)[type] as {mimetype?: string} | undefined;

            if (type?.includes('image')) m.quoted.mimetype = 'image';
            else if (type?.includes('video')) m.quoted.mimetype = 'video';
            else if (type?.includes('sticker')) m.quoted.mimetype = 'image/webp';
            else if (type?.includes('audio')) m.quoted.mimetype = 'audio';
            else if (type?.includes('document')) m.quoted.mimetype = media?.mimetype || 'application/octet-stream';
        }
    }

    if (!m.mimetype) {
        const messageContent = m.message;
        if (messageContent) {
            const type = Object.keys(messageContent)[0];
            if (type && type.includes('image')) m.mimetype = 'image';
            else if (type && type.includes('video')) m.mimetype = 'video';
            else if (type && type.includes('sticker')) m.mimetype = 'image/webp';
            else if (type && type.includes('audio')) m.mimetype = 'audio';
            else if (type && type.includes('document')) {
                const msgMedia = (messageContent as MessageRecord)[type] as {mimetype?: string} | undefined;
                m.mimetype = msgMedia?.mimetype || 'application/octet-stream';
            }
        }
    }

    if (m.key) {
        m.id = m.key.id || '';
        m.chat = m.key.remoteJid || '';
        m.fromMe = !!m.key.fromMe;
        m.isGroup = m.chat?.endsWith('@g.us') || false;
        const rawJid = m.key.participant || (m.key.remoteJid && !m.key.remoteJid.endsWith("@g.us") ? m.key.remoteJid : "")
        const keyWithAlt = m.key as typeof m.key & {participantAlt?: string; remoteJidAlt?: string};
        const altJid = keyWithAlt.participantAlt || keyWithAlt.remoteJidAlt || ""

        m.lid = rawJid?.includes("@lid") ? rawJid : altJid?.includes("@lid") ? altJid : ""

        const realJid = rawJid?.includes("@s.whatsapp.net") ? rawJid : altJid?.includes("@s.whatsapp.net") ? altJid : rawJid || altJid

        m.sender = m.key.fromMe ? (conn.user?.id || "").replace(/:\d+$/, "") : realJid

        m.who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user?.id || m.sender : m.sender;
        m.pp = m.pp || DEFAULT_PROFILE_PICTURE_URL;
    }

    m.download = async () => {
        const messageContent = m.message || (m.quoted && m.quoted.message);
        if (!messageContent) throw new Error('No se encontró contenido para descargar');
        const type = Object.keys(messageContent)[0];
        const stream = await downloadContentFromMessage((messageContent as MessageRecord)[type] as baileys.DownloadableMessage, type.includes('image') ? 'image' : type.includes('video') ? 'video' : 'document');
        return await streamToBuffer(stream);
    };

    if (!conn.__zycryxHelpersInstalled) {
    conn.decodeJid = (jid: string): string => {
        if (!jid) return jid;
        if (jid.endsWith('@lid')) return jid;
        if (/:\d+@/i.test(jid)) return jid.split(':')[0] + '@s.whatsapp.net';
        return jid;
    };

    conn.getName = async (jid: string, withoutContact: boolean = false, m: BotMessage | null = null): Promise<string | null> => {
        if (!jid) return null;
        jid = conn.decodeJid ? conn.decodeJid(jid) : jid;
        try {
            if (jid.endsWith('@g.us')) {
                const metadata = await conn.groupMetadata(jid);
                return metadata.subject || (withoutContact ? null : jid.split('@')[0]);
            } else {
                if (jid === '0@s.whatsapp.net') return 'WhatsApp';
                if (conn.user?.id && jid === conn.user.id) return conn.user.name || jid.split('@')[0];
                if (m?.pushName && m?.sender === jid) return m.pushName;

                const nombre = await getUserName(jid);
                if (nombre) return nombre;

                return jid.split('@')[0];
            }
        } catch (err) {
            logError(err);
            return jid.split('@')[0];
        }
    };

    installLegacyArrayRandom();

    if (!conn.__zycryxSendMessageWrapped) {
        const originalSendMessage = conn.sendMessage.bind(conn);
        conn.sendMessage = async function (jid: string, content: MessageContent, options: SendMessageOptions = {}) {
            const messageContent = content as MessageRecord;
            const contextInfoDefault = {
                mentionedJid: await conn.parseMention(String(messageContent.text || messageContent.caption || '')),
                isForwarded: true,
                forwardingScore: 1
            };

            if (!messageContent.contextInfo) {
                messageContent.contextInfo = contextInfoDefault;
            }

            return originalSendMessage(jid, messageContent, options);
        };
        conn.__zycryxSendMessageWrapped = true;
    }

    conn.parseMention = async (text: string = ''): Promise<string[]> => {
        try {
            if (typeof text !== 'string') return [];
            const matches = [...text.matchAll(/@([0-9]{5,15})/g)];
            return matches.map(match => `${match[1]}@s.whatsapp.net`).filter((jid: string) => jid.includes('@s.whatsapp.net'));
        } catch (e) {
            logError(e);
            return [];
        }
    };

    conn.reply = async (chatId: string, text: string, quoted: QuotedMessage = null, options: SendMessageOptions = {}) => {
        const contextInfo = {
            mentionedJid: await conn.parseMention(text),
            isForwarded: true,
            forwardingScore: 1
        };
        return await conn.sendMessage(chatId, {text, contextInfo}, {quoted, ...options});
    };

    const defaultContextInfo = async (caption: string, conn: ExtendedConn): Promise<ContextInfoLike> => ({
        mentionedJid: await conn.parseMention(caption),
        isForwarded: true,
        forwardingScore: 1
    });

    function formatExternalAdReply(obj: ExternalAdReplyLike = {}): ExternalAdReplyLike {
        if (!obj.thumbnailUrl && obj.thumbnail) {
            obj.thumbnailUrl = obj.thumbnail;
            delete obj.thumbnail;
        }
        return {
            ...obj,
            thumbnail: typeof obj.thumbnailUrl === "string" ? {url: obj.thumbnailUrl} : obj.thumbnailUrl,
        };
    }

    conn.sendFile = async function (jid: string, path: MediaInput, filename: string = '', caption: string = '', quoted: QuotedMessage = null, _ptt: boolean = false, options: SendMessageOptions = {}) {
        const contextInfo = getContextInfo(options) ?? await defaultContextInfo(caption, this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        const getCleanExt = (url: string): string => {
            const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
            return match ? match[1].toLowerCase() : 'bin';
        };

        if (Buffer.isBuffer(path)) {
            const fileInfo = await fileTypeFromBuffer(path) || {} as FileTypeResult;
            const ext = (filename.includes('.') ? filename.split('.').pop()! : 'bin').toLowerCase();
            const mime = fileInfo.mime || 'application/octet-stream';
            const fileName = filename || `file.${ext}`;

            const messageType = ((): string => {
                if (ext === 'webp') return 'sticker';
                if (['mp4', 'mov', 'mkv'].includes(ext)) return 'video';
                if (['mp3', 'm4a', 'ogg', 'wav'].includes(ext)) return 'audio';
                if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
                return 'document';
            })();

            return await this.sendMessage(jid, {
                ...(messageType === 'sticker' ? {sticker: path} : {[messageType]: path}),
                mimetype: mime,
                fileName,
                caption,
                contextInfo,
                ...options,
            }, {quoted});

        } else if (typeof path === 'string' && /https?:\/\//.test(path)) {
            try {
                const buffer = await httpBuffer(path);

                const fileInfo = await fileTypeFromBuffer(buffer) || {} as FileTypeResult;
                const mime = fileInfo.mime || 'application/octet-stream';
                const ext = (typeof filename === 'string' && filename.includes('.') ? filename.split('.').pop()! : getCleanExt(path)).toLowerCase();
                const fileName = filename || `file.${ext}`;

                const messageType = ((): string => {
                    if (ext === 'webp') return 'sticker';
                    if (['mp4', 'mov', 'mkv'].includes(ext)) return 'video';
                    if (['mp3', 'm4a', 'ogg', 'wav'].includes(ext)) return 'audio';
                    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
                    return 'document';
                })();

                return await this.sendMessage(jid, {
                    ...(messageType === 'sticker' ? {sticker: buffer} : {[messageType]: buffer}),
                    mimetype: mime,
                    fileName,
                    caption,
                    contextInfo,
                    ...options,
                }, {quoted});
            } catch (e: unknown) {
                logError(e instanceof Error ? e.message : e);
                return this.sendMessage(jid, {text: caption || filename || 'No se pudo enviar el archivo'}, {quoted});
            }
        }
        return this.sendMessage(jid, {text: caption || filename || 'Archivo no soportado'}, {quoted});
    };

    conn.sendImage = async function (jid: string, path: MediaInput, caption: string = '', quoted: QuotedMessage = null, options: SendMessageOptions = {}) {
        const contextInfo = getContextInfo(options) ?? await defaultContextInfo(caption, this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        return this.sendMessage(jid, {
            image: {url: path},
            caption,
            contextInfo,
            ...options
        }, {quoted});
    };

    conn.sendVideo = async function (jid: string, path: MediaInput, caption: string = '', quoted: QuotedMessage = null, options: SendMessageOptions = {}) {
        const contextInfo = getContextInfo(options) ?? await defaultContextInfo(caption, this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        return this.sendMessage(jid, {
            video: {url: path},
            caption,
            contextInfo,
            ...options
        }, {quoted});
    };

    conn.fakeReply = async function (
        jid: string,
        caption: string = '',
        fakeNumber: string = '0@s.whatsapp.net',
        fakeCaption: string = '',
        _quoted: QuotedMessage = null,
        options: SendMessageOptions = {}
    ) {
        const contextInfo = getContextInfo(options) ?? await defaultContextInfo(caption, this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        return this.sendMessage(jid, {
            text: caption,
            contextInfo,
            ...options
        }, {
            quoted: {
                key: {
                    fromMe: false,
                    participant: fakeNumber,
                    ...(jid.endsWith('@g.us') ? {remoteJid: jid} : {remoteJid: null})
                },
                message: {
                    conversation: fakeCaption
                },
                messageTimestamp: parseInt(String(Date.now() / 1000))
            }
        });
    };

    conn.sendAudio = async function (jid: string, path: MediaInput, quoted: QuotedMessage = null, options: SendMessageOptions = {}) {
        const contextInfo = getContextInfo(options) ?? await defaultContextInfo('', this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        return this.sendMessage(jid, {
            audio: {url: path},
            mimetype: 'audio/mpeg',
            contextInfo,
            ...options
        }, {quoted});
    };

    conn.sendAlbumMessage = async function (jid: string, medias: MessageContent[] = [], caption: string = '', quoted: QuotedMessage = null) {
        if (!Array.isArray(medias) || medias.length === 0) {
            throw new Error("No se proporcionaron medios válidos.");
        }
        const albumMedias = medias as AlbumMedia[];
        const quotedMessage = quoted && typeof quoted === 'object' ? quoted as BotMessage : null;

        const album = generateWAMessageFromContent(jid, {
            albumMessage: {
                expectedImageCount: albumMedias.filter((media) => media.type === "image").length,
                expectedVideoCount: albumMedias.filter((media) => media.type === "video").length,
                ...(quotedMessage ? {
                    contextInfo: {
                        remoteJid: quotedMessage.key.remoteJid,
                        stanzaId: quotedMessage.key.id,
                        participant: quotedMessage.key.participant || quotedMessage.key.remoteJid,
                        quotedMessage: quotedMessage.message
                    }
                } : {})
            }
        } as baileys.proto.IMessage, {quoted: quotedMessage || undefined} as unknown as Parameters<typeof generateWAMessageFromContent>[2]);

        await this.relayMessage(album.key.remoteJid!, album.message!, {
            messageId: album.key.id!
        });

        for (let i = 0; i < medias.length; i++) {
            const {type, data} = albumMedias[i];
            const mediaPayload: Record<string, unknown> = {};
            mediaPayload[type] = data;
            if (i === 0 && caption) {
                mediaPayload.caption = caption;
            }

            const mediaMessage = await generateWAMessage(album.key.remoteJid!, mediaPayload as BaileysMessageContent, {
                upload: this.waUploadToServer
            } as BaileysMessageOptions);

            (mediaMessage as GeneratedMessageWithContext).message.messageContextInfo = {
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key
                }
            };

            await this.relayMessage(mediaMessage.key.remoteJid!, mediaMessage.message!, {
                messageId: mediaMessage.key.id!
            });
        }

        return album as unknown as baileys.proto.WebMessageInfo;
    };

    conn.sendDocument = async function (jid: string, path: MediaInput, filename: string = 'file', quoted: QuotedMessage = null, options: SendMessageOptions = {}) {
        const contextInfo = getContextInfo(options) ?? await defaultContextInfo('', this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        return this.sendMessage(jid, {
            document: {url: path},
            fileName: filename,
            mimetype: 'application/octet-stream',
            contextInfo,
            ...options
        }, {quoted});
    };

    conn.sendSticker = async (jid: string, path: MediaInput, quoted: QuotedMessage = null, options: SendMessageOptions = {}) => {
        const contextInfo = getContextInfo(options) ?? await defaultContextInfo('', conn)
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply)
        delete options.contextInfo;

        return conn.sendMessage(
            jid,
            {
                sticker: typeof path === 'string' ? {url: path} : path,
                contextInfo,
                ...options
            },
            {quoted}
        )
    }

    conn.sendPtt = async (jid: string, path: MediaInput, quoted: QuotedMessage = null, options: SendMessageOptions = {}) => {
        const contextInfo = getContextInfo(options) || {};
        delete options.contextInfo;

        return conn.sendMessage(
            jid,
            {
                audio: {url: path},
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                contextInfo,
                ...options
            },
            {quoted}
        );
    };
        conn.__zycryxHelpersInstalled = true;
    }

    m.react = async (emoji: string) => {
        if (!emoji) return;
        await conn.sendMessage(m.chat || m.key.remoteJid || '', {
            react: {text: emoji, key: m.key}
        });
    };

    return m;
}

async function streamToBuffer(stream: AsyncIterableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}
