import {logError} from '../../lib/logger.js';
import crypto from 'crypto';
import {downloadContentFromMessage} from '@whiskeysockets/baileys';
import {httpJson} from '../../lib/http-client.js';
import {deleteAudioEntry, findAudioEntryInScopes, getAudioConfig, upsertAudioEntry} from '../../services/audio-response.service.js';
import {getDecodedApiToken} from '../../services/api-token.service.js';
import {definePlugin} from '../../core/define-plugin.js';

const GITHUB_REPO = 'LoliBottt/multimedia';
const GITHUB_BRANCH = 'main';

interface GithubFileResponse {
    sha?: string;
}

interface GithubUploadResponse {
    content?: {
        download_url?: string;
    };
}

export default definePlugin({
    help: ['addaudios', 'delaudios'],
    tags: ['main'],
    command: /^(addaudios|delaudios)$/i,
    register: true,
    async execute(m, {text, isOwner, isAdmin, command}) {
    const chatId = m.chat;
    const isGroup = chatId.endsWith('@g.us');
    const scope = isOwner ? 'global' : chatId;
    const [fraseRaw, ...resto] = text.split('-');
    const frases = fraseRaw.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean);

    if (!frases.length) return m.reply(`✳️ Usa:\n${command === 'addaudios' ? '.addaudios hola,hello - audio' : '.delaudios hola'}`);

    if (!isOwner && isGroup && !isAdmin) return m.reply('🚫 Solo admins pueden usar este comando en este grupo');

    if (command === 'delaudios') {
        const frase = frases[0];
        if (scope === 'global' && !isOwner) return m.reply('🚫 Solo los owners pueden eliminar audios globales.');

        const searchableScopes = isOwner ? Object.keys(await getAudioConfig()) : [scope];
        const found = await findAudioEntryInScopes(searchableScopes, frase);
        if (!found) return m.reply(`❌ No existe un audio guardado con la frase: *${frase}*`);

        await deleteAudioEntry(found.scope, frase, found.entry.regex);
        return m.reply(`🗑️ Audio *${frase}* eliminado correctamente del scope: ${found.scope}`);
    }

    const GITHUB_TOKEN = await getDecodedApiToken('github_token');
    if (!GITHUB_TOKEN) return m.reply('❌ No se encontró el token en la base de datos.');

    const url = resto.join('-')?.trim() || null;
    let githubRawUrl: string | null = null;

    if (url?.startsWith('http')) {
        githubRawUrl = url;
    } else if (m.quoted?.message?.audioMessage) {
        try {
            const audioMsg = m.quoted.message.audioMessage;
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
            const fileName = `media/audio_${hash}.opus`;
            const base64 = buffer.toString('base64');
            const githubApiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}`;

            let sha: string | null = null;
            try {
                const existing = await httpJson<GithubFileResponse>(githubApiUrl, {
                    method: 'GET',
                    headers: {Authorization: `token ${GITHUB_TOKEN}`},
                    expectedStatuses: [200],
                });
                sha = existing.sha || null;
            } catch {
                sha = null;
            }

            const data = await httpJson<GithubUploadResponse>(githubApiUrl, {
                method: 'PUT',
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `add ${fileName}`,
                    content: base64,
                    branch: GITHUB_BRANCH,
                    ...(sha && {sha})
                })
            });
            if (!data.content?.download_url) {
                logError('[❌] Error al subir audio a GitHub:', data);
                return m.reply('❌ Error al subir audio.');
            }

            githubRawUrl = data.content.download_url;
        } catch (e: unknown) {
            logError('[❌] Error al procesar audio citado:', e);
            return m.reply('❌ No se pudo procesar el audio, por favor respondar a un audios nota de voz.');
        }
    } else {
        return m.reply('❌ Responde a un audio o usa una URL válida.');
    }

    for (const frase of frases) {
        const regex = `(${frase})`;
        const current = (await getAudioConfig([scope]))[scope]?.[frase];

        if (!current) {
            await upsertAudioEntry(scope, frase, {
                regex,
                audio: githubRawUrl
            });
        } else if (current.audio && current.audio !== githubRawUrl) {
            await upsertAudioEntry(scope, frase, {
                regex,
                audios: [current.audio, githubRawUrl]
            });
        } else if (current.audios && !current.audios.includes(githubRawUrl)) {
            await upsertAudioEntry(scope, frase, {
                regex: current.regex || regex,
                audios: [...current.audios, githubRawUrl],
            });
        }
    }

    return m.reply(`✅ Audio guardado:\n📌 Frases: ${frases.join(', ')}\n🌐 Enlace: ${githubRawUrl}`);
    }
});
