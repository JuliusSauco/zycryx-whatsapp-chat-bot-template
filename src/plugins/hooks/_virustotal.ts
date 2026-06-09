import {downloadContentFromMessage} from '@whiskeysockets/baileys';
import {fileTypeFromBuffer} from 'file-type';
import {
    formatBytes,
    formatVirusTotalSummary,
    formatVirusTotalUrlSummary,
    getVirusTotalMaxFileBytes,
    isVirusTotalConfigured,
    scanFileWithVirusTotal,
    scanUrlWithVirusTotal,
} from '../../lib/virustotal.js';
import {logError} from '../../lib/logger.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import type {BeforePluginContext, ExtendedConn} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';
import type {VirusTotalStats} from '../../lib/virustotal.js';

type MessageRecord = Record<string, unknown>;
type MediaPayload = {
    mimetype?: string;
    fileName?: string;
    caption?: string;
    seconds?: number;
    fileLength?: number | Long | string;
};
type BaileysMediaKind = 'image' | 'video' | 'audio' | 'document';
type AsyncIterableStream = AsyncIterable<Buffer | Uint8Array>;
type ThreatKind = 'archivo' | 'enlace';

const MEDIA_MESSAGE_TYPES = new Set([
    'documentMessage',
    'imageMessage',
    'videoMessage',
    'audioMessage',
]);

const FALLBACK_EXTENSION_BY_MIME: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.android.package-archive': 'apk',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
};
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|edu|gov|mil|int|io|co|dev|app|xyz|info|biz|me|tv|gg|ly|link|site|online|store|cloud|tech|ai|pe|cl|ar|ec|bo|uy|py|ve|mx|br|es|us|uk|ca|de|fr|it|nl|jp|kr|cn|in|au|ru|za|co\.uk|com\.co|com\.mx|com\.br)(?:\/[^\s<>"']*)?/gi;
const recentlyScannedUrls = new Map<string, number>();
const URL_DEDUP_TTL_MS = 2 * 60 * 1000;

export const runBeforeOnCommand = true;

function unwrapMessage(message: unknown): MessageRecord | null {
    const current = message as MessageRecord | null | undefined;
    const nested = current?.ephemeralMessage as {message?: unknown} | undefined
        || current?.viewOnceMessage as {message?: unknown} | undefined
        || current?.viewOnceMessageV2 as {message?: unknown} | undefined
        || current?.documentWithCaptionMessage as {message?: unknown} | undefined;

    if (nested?.message) return unwrapMessage(nested.message);
    return current && typeof current === 'object' ? current : null;
}

function getIncomingMedia(m: BotMessage): {type: string; payload: MediaPayload} | null {
    const content = unwrapMessage(m.message);
    if (!content) return null;

    for (const [type, payload] of Object.entries(content)) {
        if (!MEDIA_MESSAGE_TYPES.has(type)) continue;
        if (!payload || typeof payload !== 'object') return null;
        return {type, payload: payload as MediaPayload};
    }

    return null;
}

function extractUrls(text: string): string[] {
    if (!text) return [];
    const urls = new Set<string>();
    for (const match of text.matchAll(URL_REGEX)) {
        const url = match[0]?.trim().replace(/^[([{<]+/g, '').replace(/[)\].,!?;:]+$/g, '');
        if (!url) continue;
        urls.add(url);
    }
    return [...urls].slice(0, 3);
}

function extensionFromName(filename: string): string {
    const match = /\.([a-z0-9]{1,12})$/i.exec(filename);
    return match ? match[1].toLowerCase() : '';
}

function buildFileName(payload: MediaPayload, detectedExt?: string): string {
    const rawName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
    if (rawName) return rawName.slice(0, 160);

    const mime = payload.mimetype || 'application/octet-stream';
    const ext = detectedExt || FALLBACK_EXTENSION_BY_MIME[mime] || mime.split('/')[1]?.split(';')[0] || 'bin';
    return `whatsapp-file.${ext}`;
}

function normalizeMime(payload: MediaPayload, detectedMime?: string): string {
    if (payload.mimetype && payload.mimetype.includes('/')) return payload.mimetype;
    return detectedMime || 'application/octet-stream';
}

function getDeclaredSize(payload: MediaPayload): number | null {
    if (payload.fileLength === undefined || payload.fileLength === null) return null;
    const value = typeof payload.fileLength === 'object' && 'toString' in payload.fileLength
        ? Number(payload.fileLength.toString())
        : Number(payload.fileLength);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function getDownloadKind(type: string): BaileysMediaKind {
    if (type === 'imageMessage') return 'image';
    if (type === 'videoMessage') return 'video';
    if (type === 'audioMessage') return 'audio';
    return 'document';
}

async function streamToBuffer(stream: AsyncIterableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}

async function downloadIncomingMedia(type: string, payload: MediaPayload): Promise<Buffer> {
    const stream = await downloadContentFromMessage(payload as never, getDownloadKind(type));
    return streamToBuffer(stream as AsyncIterableStream);
}

async function reactToScanResult(conn: ExtendedConn, m: BotMessage, stats: VirusTotalStats): Promise<void> {
    const isRisky = (stats.malicious || 0) > 0 || (stats.suspicious || 0) > 0;
    await conn.sendMessage(m.chat, {react: {text: isRisky ? '❌' : '✅', key: m.key}});
}

function getDeleteParticipant(m: BotMessage): string {
    return m.key.participant || m.sender;
}

async function handleMaliciousContent(conn: ExtendedConn, m: BotMessage, stats: VirusTotalStats, kind: ThreatKind, label: string): Promise<void> {
    if ((stats.malicious || 0) <= 0) return;

    const target = getDeleteParticipant(m);
    const targetMention = m.sender ? `@${m.sender.split('@')[0]}` : 'el usuario';
    const threatLabel = kind === 'archivo' ? `el archivo *${label}*` : `el enlace *${label}*`;

    if (!m.isBotAdmin) {
        await conn.sendMessage(m.chat, {
            text: renderTemplate(getRequiredPluginMessage('hooks.virusTotal.maliciousNoAdmin'), {
                threatLabel
            }),
            mentions: m.sender ? [m.sender] : [],
        }, {quoted: m});
        return;
    }

    let deleted = false;
    let removed = false;

    try {
        await conn.sendMessage(m.chat, {delete: {...m.key, participant: target}});
        deleted = true;
    } catch (error) {
        logError('[VirusTotal] No se pudo eliminar el mensaje malicioso:', error);
    }

    try {
        if (m.sender) {
            await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
            removed = true;
        }
    } catch (error) {
        logError('[VirusTotal] No se pudo expulsar al autor del contenido malicioso:', error);
    }

    await conn.sendMessage(m.chat, {
        text: renderTemplate(getRequiredPluginMessage('hooks.virusTotal.maliciousActionReport'), {
            threatLabel,
            deleteStatus: deleted
                ? getRequiredPluginMessage('hooks.virusTotal.messageDeleted')
                : getRequiredPluginMessage('hooks.virusTotal.messageDeleteFailed'),
            removeStatus: removed
                ? renderTemplate(getRequiredPluginMessage('hooks.virusTotal.authorRemoved'), {user: targetMention})
                : renderTemplate(getRequiredPluginMessage('hooks.virusTotal.authorRemoveFailed'), {user: targetMention})
        }),
        mentions: m.sender ? [m.sender] : [],
    });
}

function shouldSkipUrl(chatId: string, url: string): boolean {
    const key = `${chatId}:${url.toLowerCase()}`;
    const now = Date.now();
    const previous = recentlyScannedUrls.get(key) || 0;
    if (now - previous < URL_DEDUP_TTL_MS) return true;

    recentlyScannedUrls.set(key, now);
    setTimeout(() => recentlyScannedUrls.delete(key), URL_DEDUP_TTL_MS);
    return false;
}

async function scanUrlsInText(conn: ExtendedConn, m: BotMessage, text: string): Promise<void> {
    const urls = extractUrls(text);
    for (const url of urls) {
        if (shouldSkipUrl(m.chat, url)) continue;
        try {
            await conn.sendMessage(m.chat, {react: {text: '🔎', key: m.key}});
            const summary = await scanUrlWithVirusTotal(url);
            const message = formatVirusTotalUrlSummary(summary);
            await conn.sendMessage(m.chat, {text: message}, {quoted: m});
            await reactToScanResult(conn, m, summary.stats);
            await handleMaliciousContent(conn, m, summary.stats, 'enlace', summary.url);
        } catch (error: unknown) {
            const detail = error instanceof Error ? error.message : String(error);
            logError('[VirusTotal URL]', detail);
            await conn.sendMessage(m.chat, {react: {text: '❌', key: m.key}});
            await conn.sendMessage(m.chat, {
                text: renderTemplate(getRequiredPluginMessage('hooks.virusTotal.urlScanError'), {detail}),
            }, {quoted: m});
        }
    }
}

export async function before(m: BotMessage, {conn, groupSettings}: BeforePluginContext) {
    if (!m.isGroup || m.fromMe) return;
    if (!isVirusTotalConfigured()) return;
    if (!groupSettings?.virusTotal) return;

    const media = getIncomingMedia(m);
    if (!media) {
        await scanUrlsInText(conn, m, m.originalText || m.text || '');
        return;
    }

    const declaredSize = getDeclaredSize(media.payload);
    const maxBytes = getVirusTotalMaxFileBytes();
    if (declaredSize && declaredSize > maxBytes) {
        const filename = buildFileName(media.payload);
        await conn.sendMessage(m.chat, {
            text: renderTemplate(getRequiredPluginMessage('hooks.virusTotal.declaredFileTooLarge'), {
                filename,
                size: formatBytes(declaredSize),
                maxSize: formatBytes(maxBytes)
            }),
        }, {quoted: m});
        return;
    }

    try {
        await conn.sendMessage(m.chat, {react: {text: '🔎', key: m.key}});
        const buffer = await downloadIncomingMedia(media.type, media.payload);
        if (!buffer?.length) return;

        if (buffer.length > maxBytes) {
            await conn.sendMessage(m.chat, {
                text: renderTemplate(getRequiredPluginMessage('hooks.virusTotal.downloadedFileTooLarge'), {
                    size: formatBytes(buffer.length),
                    maxSize: formatBytes(maxBytes)
                }),
            }, {quoted: m});
            await conn.sendMessage(m.chat, {react: {text: '❌', key: m.key}});
            return;
        }

        const detected = await fileTypeFromBuffer(buffer).catch(() => undefined);
        const mimetype = normalizeMime(media.payload, detected?.mime);
        const filename = buildFileName(media.payload, detected?.ext || extensionFromName(media.payload.fileName || ''));
        const summary = await scanFileWithVirusTotal(buffer, filename, mimetype);
        const message = formatVirusTotalSummary(summary, filename, buffer.length);

        await conn.sendMessage(m.chat, {text: message}, {quoted: m});
        await reactToScanResult(conn, m, summary.stats);
        await handleMaliciousContent(conn, m, summary.stats, 'archivo', filename);
        await scanUrlsInText(conn, m, media.payload.caption || m.originalText || m.text || '');
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        logError('[VirusTotal]', detail);
        await conn.sendMessage(m.chat, {react: {text: '❌', key: m.key}});
        await conn.sendMessage(m.chat, {
            text: renderTemplate(getRequiredPluginMessage('hooks.virusTotal.fileScanError'), {detail}),
        }, {quoted: m});
    }
}
