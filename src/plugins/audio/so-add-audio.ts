import {logError} from '../../lib/logger.js';
import crypto from 'crypto';
import {mkdir, writeFile} from 'fs/promises';
import path from 'path';
import {downloadContentFromMessage} from '@whiskeysockets/baileys';
import {deleteAudioEntry, findAudioEntryInScopes, getAudioConfig, upsertAudioEntry} from '../../services/audio-response.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

const CUSTOM_AUDIO_DIR = path.join(process.cwd(), 'resources', 'media', 'audio', 'custom');
const CUSTOM_AUDIO_PUBLIC_DIR = './resources/media/audio/custom';

interface AudioPayload {
    buffer: Buffer;
    extension: string;
}

function getExtensionFromMime(mimeType?: string | null): string {
    if (!mimeType) return 'opus';
    if (mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
    if (mimeType.includes('ogg') || mimeType.includes('opus')) return 'opus';
    if (mimeType.includes('wav')) return 'wav';
    return 'opus';
}

function getExtensionFromUrl(url: string, contentType?: string | null): string {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).replace('.', '').toLowerCase();
    if (['mp3', 'm4a', 'ogg', 'opus', 'wav'].includes(ext)) return ext;
    return getExtensionFromMime(contentType);
}

async function saveCustomAudio({buffer, extension}: AudioPayload): Promise<string> {
    await mkdir(CUSTOM_AUDIO_DIR, {recursive: true});
    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 12);
    const fileName = `audio_${hash}.${extension}`;
    const fullPath = path.join(CUSTOM_AUDIO_DIR, fileName);
    await writeFile(fullPath, buffer);
    return `${CUSTOM_AUDIO_PUBLIC_DIR}/${fileName}`;
}

export default defineSdkPlugin({
    help: ['addaudios', 'delaudios'],
    tags: ['main'],
    command: /^(addaudios|delaudios)$/i,
    register: true,
    async execute(m, {sdk}) {
    const chatId = sdk.chatId;
    const isGroup = chatId.endsWith('@g.us');
    const scope = sdk.isOwner ? 'global' : chatId;
    const [fraseRaw, ...resto] = sdk.text.split('-');
    const frases = fraseRaw.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean);

    if (!frases.length) return sdk.reply.message('audio.custom.usage', {
        usage: sdk.command === 'addaudios' ? sdk.content.message('audio.custom.addUsage') : sdk.content.message('audio.custom.deleteUsage')
    });

    if (!sdk.isOwner && isGroup && !sdk.isAdmin) return sdk.reply.message('audio.custom.adminOnly');

    if (sdk.command === 'delaudios') {
        const frase = frases[0];
        if (scope === 'global' && !sdk.isOwner) return sdk.reply.message('audio.custom.ownerDeleteOnly');

        const searchableScopes = sdk.isOwner ? Object.keys(await getAudioConfig()) : [scope];
        const found = await findAudioEntryInScopes(searchableScopes, frase);
        if (!found) return sdk.reply.message('audio.custom.notFound', {phrase: frase});

        await deleteAudioEntry(found.scope, frase, found.entry.regex);
        return sdk.reply.message('audio.custom.deleted', {phrase: frase, scope: found.scope});
    }

    const url = resto.join('-')?.trim() || null;
    let audioPath: string | null = null;

    if (url?.startsWith('http')) {
        try {
            const response = await sdk.http.request(url);
            const contentType = response.headers.get('content-type');
            const buffer = Buffer.from(await response.arrayBuffer());
            audioPath = await saveCustomAudio({
                buffer,
                extension: getExtensionFromUrl(url, contentType),
            });
        } catch (e: unknown) {
            logError('[❌] Error al descargar audio desde URL:', e);
            return sdk.reply.message('audio.custom.downloadError');
        }
    } else if (m.quoted?.message?.audioMessage) {
        try {
            const audioMsg = m.quoted.message.audioMessage;
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            audioPath = await saveCustomAudio({
                buffer,
                extension: getExtensionFromMime(audioMsg.mimetype),
            });
        } catch (e: unknown) {
            logError('[❌] Error al procesar audio citado:', e);
            return sdk.reply.message('audio.custom.processError');
        }
    } else {
        return sdk.reply.message('audio.custom.missingAudio');
    }

    if (!audioPath) return sdk.reply.message('audio.custom.saveError');

    for (const frase of frases) {
        const regex = `(${frase})`;
        const current = (await getAudioConfig([scope]))[scope]?.[frase];

        if (!current) {
            await upsertAudioEntry(scope, frase, {
                regex,
                audio: audioPath
            });
        } else if (current.audio && current.audio !== audioPath) {
            await upsertAudioEntry(scope, frase, {
                regex,
                audios: [current.audio, audioPath]
            });
        } else if (current.audios && !current.audios.includes(audioPath)) {
            await upsertAudioEntry(scope, frase, {
                regex: current.regex || regex,
                audios: [...current.audios, audioPath],
            });
        }
    }

    return sdk.reply.message('audio.custom.saved', {
        phrases: frases.join(', '),
        file: audioPath
    });
    }
});
