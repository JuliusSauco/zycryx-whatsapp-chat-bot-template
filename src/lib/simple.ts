import * as baileys from "@whiskeysockets/baileys";
import {fileTypeFromBuffer} from 'file-type'
import fetch from 'node-fetch';
import type {BotMessage} from '../types/message.js';
import {getUserName} from '../services/user.service.js';

const {
    proto,
    downloadMediaMessage,
    downloadContentFromMessage,
    generateWAMessage,
    generateWAMessageFromContent,
} = baileys;

const DEFAULT_PROFILE_PICTURE_URL = 'https://telegra.ph/file/33bed21a0eaa789852c30.jpg';

export async function smsg(conn: any, m: any): Promise<BotMessage> {
    if (!m) return m;
    const M = proto.WebMessageInfo;

    if (!m.mentionedJid) m.mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    if (!m.quoted && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const ctx = m.message.extendedTextMessage.contextInfo;
        const quotedMessage = {
            key: {
                id: ctx.stanzaId,
                fromMe: ctx.participant === conn.user?.jid,
                remoteJid: m.chat,
                participant: ctx.participant,
            },
            message: ctx.quotedMessage,
            messageTimestamp: m.messageTimestamp,
            participant: ctx.participant,
            sender: ctx.participant,
            chat: m.chat,
        };
        m.quoted = {
            ...quotedMessage,
            download: () => downloadMediaMessage(quotedMessage as any, 'buffer', {}),
        };
    }

    m.user = m.user || {};
    m.chatDB = m.chatDB || {};

    if (m.quoted && m.quoted.message && typeof m.quoted.message === 'object') {
        const keys = Object.keys(m.quoted.message);
        if (keys.length > 0) {
            const type = keys[0];
            const media = m?.quoted.message[type];

            if (type?.includes('image')) m.quoted.mimetype = 'image';
            else if (type?.includes('video')) m.quoted.mimetype = 'video';
            else if (type?.includes('sticker')) m.quoted.mimetype = 'image/webp';
            else if (type?.includes('audio')) m.quoted.mimetype = 'audio';
            else if (type?.includes('document')) m.quoted.mimetype = media.mimetype || 'application/octet-stream';
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
                const msgMedia = messageContent[type];
                m.mimetype = msgMedia?.mimetype || 'application/octet-stream';
            }
        }
    }

    if (m.key) {
        m.id = m.key.id;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat?.endsWith('@g.us') || false;
        let senderJid = m.fromMe ? conn.user.id : m.key.participant || m.key.remoteJid;

        const rawJid = m.key.participant || (m.key.remoteJid && !m.key.remoteJid.endsWith("@g.us") ? m.key.remoteJid : "")
        const altJid = m.key.participantAlt || m.key.remoteJidAlt || ""

        m.lid = rawJid?.includes("@lid") ? rawJid : altJid?.includes("@lid") ? altJid : ""

        const realJid = rawJid?.includes("@s.whatsapp.net") ? rawJid : altJid?.includes("@s.whatsapp.net") ? altJid : rawJid || altJid

        m.sender = m.key.fromMe ? (conn.user?.id || "").replace(/:\d+$/, "") : realJid

        m.who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.id : m.sender;
        m.pp = m.pp || DEFAULT_PROFILE_PICTURE_URL;
    }

    m.download = async () => {
        const messageContent = m.message || (m.quoted && m.quoted.message);
        if (!messageContent) throw new Error('No se encontró contenido para descargar');
        const type = Object.keys(messageContent)[0];
        const stream = await downloadContentFromMessage(messageContent[type], type.includes('image') ? 'image' : type.includes('video') ? 'video' : 'document');
        return await streamToBuffer(stream);
    };

    conn.decodeJid = (jid: string): string => {
        if (!jid) return jid;
        if (jid.endsWith('@lid')) return jid;
        if (/:\d+@/i.test(jid)) return jid.split(':')[0] + '@s.whatsapp.net';
        return jid;
    };

    conn.getName = async (jid: string, withoutContact: boolean = false, m: any = null): Promise<string | null> => {
        if (!jid) return null;
        jid = conn.decodeJid ? conn.decodeJid(jid) : jid;
        try {
            if (jid.endsWith('@g.us')) {
                const metadata = await conn.groupMetadata(jid);
                return metadata.subject || (withoutContact ? null : jid.split('@')[0]);
            } else {
                if (jid === '0@s.whatsapp.net') return 'WhatsApp';
                if (conn.user?.jid && jid === conn.user.jid) return conn.user.name || jid.split('@')[0];
                if (m?.pushName && m?.sender === jid) return m.pushName;

                const nombre = await getUserName(jid);
                if (nombre) return nombre;

                return jid.split('@')[0];
            }
        } catch (err) {
            console.error(err);
            return jid.split('@')[0];
        }
    };

    if (!Array.prototype.getRandom) {
        Array.prototype.getRandom = function () {
            return this[Math.floor(Math.random() * this.length)];
        };
    }

    if (!(conn as any).__zycryxSendMessageWrapped) {
        const originalSendMessage = conn.sendMessage.bind(conn);
        conn.sendMessage = async function (jid: string, content: any, options: any = {}) {
            const contextInfoDefault = {
                mentionedJid: await conn.parseMention(content?.text || content?.caption || ''),
                isForwarded: true,
                forwardingScore: 1,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: (() => {
                        const loli = "120363321650707484@newsletter";
                        const otros = ["120363368880733138@newsletter", "120363301598733462@newsletter"];
                        return Math.random() < 0.75 ? loli : otros[Math.floor(Math.random() * otros.length)]
                    })(),
                    newsletterName: info.wm
                }
            };

            if (!content.contextInfo) {
                content.contextInfo = contextInfoDefault;
            }

            return originalSendMessage(jid, content, options);
        };
        (conn as any).__zycryxSendMessageWrapped = true;
    }

    conn.parseMention = async (text: string = ''): Promise<string[]> => {
        try {
            if (typeof text !== 'string') return [];
            const matches = [...text.matchAll(/@([0-9]{5,15})/g)];
            return matches.map(match => `${match[1]}@s.whatsapp.net`).filter((jid: string) => jid.includes('@s.whatsapp.net'));
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    conn.reply = async (chatId: string, text: string, quoted: any = null, options: any = {}) => {
        const contextInfo = {
            mentionedJid: await conn.parseMention(text),
            isForwarded: true,
            forwardingScore: 1,
            forwardedNewsletterMessageInfo: {
                newsletterJid: (() => {
                    const loli = "120363321650707484@newsletter";
                    const otros = ["120363368880733138@newsletter", "120363301598733462@newsletter"];
                    return Math.random() < 0.75 ? loli : otros[Math.floor(Math.random() * otros.length)]
                })(),
                newsletterName: info.wm
            }
        };
        return await conn.sendMessage(chatId, {text, contextInfo}, {quoted, ...options});
    };

    m.react = async (emoji: string) => {
        if (!emoji) return;
        await conn.sendMessage(m.chat || m.key.remoteJid, {
            react: {text: emoji, key: m.key}
        });
    };

    const defaultContextInfo = async (caption: string, conn: any) => ({
        mentionedJid: await conn.parseMention(caption),
        isForwarded: true,
        forwardingScore: 1,
        forwardedNewsletterMessageInfo: {
            newsletterJid: (() => {
                const loli = "120363321650707484@newsletter";
                const otros = ["120363368880733138@newsletter", "120363301598733462@newsletter"];
                return Math.random() < 0.75 ? loli : otros[Math.floor(Math.random() * otros.length)]
            })(),
            newsletterName: info.wm
        }
    });

    function formatExternalAdReply(obj: any = {}): any {
        if (!obj.thumbnailUrl && obj.thumbnail) {
            obj.thumbnailUrl = obj.thumbnail;
            delete obj.thumbnail;
        }
        return {
            ...obj,
            thumbnail: typeof obj.thumbnailUrl === "string" ? {url: obj.thumbnailUrl} : obj.thumbnailUrl,
        };
    }

    conn.sendFile = async function (jid: string, path: Buffer | string, filename: string = '', caption: string = '', quoted: any = null, ptt: boolean = false, options: any = {}) {
        const contextInfo = options.contextInfo ?? await defaultContextInfo(caption, this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        const getCleanExt = (url: string): string => {
            const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
            return match ? match[1].toLowerCase() : 'bin';
        };

        if (Buffer.isBuffer(path)) {
            const fileInfo = await fileTypeFromBuffer(path) || {} as any;
            const ext = (filename.includes('.') ? filename.split('.').pop()! : getCleanExt(path as any)).toLowerCase();
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
                const res = await fetch(path);
                if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
                const buffer = Buffer.from(await res.arrayBuffer());

                const fileInfo = await fileTypeFromBuffer(buffer) || {} as any;
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
            } catch (e: any) {
                console.error(e.message);
                return null;
            }
        }
    };

    conn.sendImage = async function (jid: string, path: string, caption: string = '', quoted: any = null, options: any = {}) {
        const contextInfo = options.contextInfo ?? await defaultContextInfo(caption, this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        return this.sendMessage(jid, {
            image: {url: path},
            caption,
            contextInfo,
            ...options
        }, {quoted});
    };

    conn.sendVideo = async function (jid: string, path: string, caption: string = '', quoted: any = null, options: any = {}) {
        const contextInfo = options.contextInfo ?? await defaultContextInfo(caption, this);
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
        quoted: any = null,
        options: any = {}
    ) {
        const contextInfo = options.contextInfo ?? await defaultContextInfo(caption, this);
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

    conn.sendAudio = async function (jid: string, path: string, quoted: any = null, options: any = {}) {
        const contextInfo = options.contextInfo ?? await defaultContextInfo('', this);
        if (contextInfo.externalAdReply) contextInfo.externalAdReply = formatExternalAdReply(contextInfo.externalAdReply);
        delete options.contextInfo;

        return this.sendMessage(jid, {
            audio: {url: path},
            mimetype: 'audio/mpeg',
            contextInfo,
            ...options
        }, {quoted});
    };

    conn.sendAlbumMessage = async function (jid: string, medias: any[] = [], caption: string = '', quoted: any = null) {
        if (!Array.isArray(medias) || medias.length === 0) {
            throw new Error("No se proporcionaron medios válidos.");
        }

        const album = generateWAMessageFromContent(jid, {
            albumMessage: {
                expectedImageCount: medias.filter((media: any) => media.type === "image").length,
                expectedVideoCount: medias.filter((media: any) => media.type === "video").length,
                ...(quoted ? {
                    contextInfo: {
                        remoteJid: quoted.key.remoteJid,
                        fromMe: quoted.key.fromMe,
                        stanzaId: quoted.key.id,
                        participant: quoted.key.participant || quoted.key.remoteJid,
                        quotedMessage: quoted.message
                    }
                } : {})
            }
        } as any, {quoted} as any);

        await this.relayMessage(album.key.remoteJid!, album.message!, {
            messageId: album.key.id!
        });

        for (let i = 0; i < medias.length; i++) {
            const {type, data} = medias[i];
            const mediaPayload: any = {};
            mediaPayload[type] = data;
            if (i === 0 && caption) {
                mediaPayload.caption = caption;
            }

            const mediaMessage = await generateWAMessage(album.key.remoteJid!, mediaPayload, {
                upload: this.waUploadToServer
            } as any);

            (mediaMessage as any).message.messageContextInfo = {
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key
                }
            };

            await this.relayMessage(mediaMessage.key.remoteJid!, mediaMessage.message!, {
                messageId: mediaMessage.key.id!
            });
        }

        return album;
    };

    conn.sendDocument = async function (jid: string, path: string, filename: string = 'file', quoted: any = null, options: any = {}) {
        const contextInfo = options.contextInfo ?? await defaultContextInfo('', this);
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

    conn.sendSticker = async (jid: string, path: any, quoted: any = null, options: any = {}) => {
        const contextInfo = options.contextInfo ?? await defaultContextInfo('', conn)
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

    conn.sendPtt = async (jid: string, path: string, quoted: any = null, options: any = {}) => {
        const contextInfo = options.contextInfo || {};
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

    return m;
}

function cleanJid(jid: string): string {
    if (!jid) return jid;
    if (jid.includes('@lid')) return jid;
    return jid.replace(/:\d+/, '').replace('@s.whatsapp.net', '') + '@s.whatsapp.net';
}

async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}
