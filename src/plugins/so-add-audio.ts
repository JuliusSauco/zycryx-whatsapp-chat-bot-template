import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import {pathToFileURL} from 'url';
import {downloadContentFromMessage} from '@whiskeysockets/baileys';
import {getDecodedApiToken} from '../services/api-token.service.js';
import {definePlugin} from '../core/define-plugin.js';

const GITHUB_REPO = 'LoliBottt/multimedia';
const GITHUB_BRANCH = 'main';

interface AudioEntry {
    regex: string;
    audio?: string;
    audios?: string[];
}

type AudioConfig = Record<string, Record<string, AudioEntry>>;

interface GithubFileResponse {
    sha?: string;
}

interface GithubUploadResponse {
    content?: {
        download_url?: string;
    };
}

const audiosPath = path.resolve('./src/audios.json');

export default definePlugin({
    help: ['addaudios', 'delaudios'],
    tags: ['main'],
    command: /^(addaudios|delaudios)$/i,
    register: true,
    async execute(m, {text, isOwner, isAdmin, command}) {
    let audios = readAudios();
    const GITHUB_TOKEN = await getDecodedApiToken('github_token');
    if (!GITHUB_TOKEN) return m.reply('❌ No se encontró el token en la base de datos.');

    const chatId = m.chat;
    const isGroup = chatId.endsWith('@g.us');
    const scope = isOwner ? 'global' : chatId;
    if (!audios[scope]) audios[scope] = {};
    const [fraseRaw, ...resto] = text.split('-');
    const frases = fraseRaw.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean);

    if (!frases.length) return m.reply(`✳️ Usa:\n${command === 'addaudios' ? '.addaudios hola,hello - audio' : '.delaudios hola'}`);

    if (!isOwner && isGroup && !isAdmin) return m.reply('🚫 Solo admins pueden usar este comando en este grupo');

    if (command === 'delaudios') {
        const frase = frases[0];
        const currentScope = audios[scope] || {};

        if (!currentScope[frase]) {
            let encontrado = false;
            for (const key in audios) {
                if (audios[key]?.[frase]) {
                    if (key !== scope && (key === 'global' && !isOwner)) continue;
                    delete audios[key][frase];
                    encontrado = true;
                    await persistAudios(audios);
                    return m.reply(`🗑️ Audio *${frase}* eliminado correctamente del scope: ${key}`);
                }
            }

            if (!encontrado) return m.reply(`❌ No existe un audio guardado con la frase: *${frase}*`);
        } else {
            if (scope === 'global' && !isOwner) return m.reply('🚫 Solo los owners pueden eliminar audios globales.');
            delete audios[scope][frase];
            await persistAudios(audios);
            return m.reply(`🗑️ Audio *${frase}* eliminado correctamente de ${isOwner ? 'global' : 'este grupo/chat'}`);
        }
    }

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
            const check = await fetch(githubApiUrl, {method: 'GET', headers: {Authorization: `token ${GITHUB_TOKEN}`}});
            if (check.status === 200) {
                const existing = await check.json() as GithubFileResponse;
                sha = existing.sha || null;
            }

            const res = await fetch(githubApiUrl, {
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

            const data = await res.json() as GithubUploadResponse;
            if (!data.content?.download_url) {
                console.error('[❌] Error al subir audio a GitHub:', data);
                return m.reply('❌ Error al subir audio.');
            }

            githubRawUrl = data.content.download_url;
        } catch (e: unknown) {
            console.error('[❌] Error al procesar audio citado:', e);
            return m.reply('❌ No se pudo procesar el audio, por favor respondar a un audios nota de voz.');
        }
    } else {
        return m.reply('❌ Responde a un audio o usa una URL válida.');
    }

    for (const frase of frases) {
        const regex = `(${frase})`;
        const current = audios[scope][frase];

        if (!current) {
            audios[scope][frase] = {
                regex,
                audio: githubRawUrl
            };
        } else if (current.audio && current.audio !== githubRawUrl) {
            audios[scope][frase] = {
                regex,
                audios: [current.audio, githubRawUrl]
            };
        } else if (current.audios && !current.audios.includes(githubRawUrl)) {
            current.audios.push(githubRawUrl);
        }
    }

    await persistAudios(audios);
    return m.reply(`✅ Audio guardado:\n📌 Frases: ${frases.join(', ')}\n🌐 Enlace: ${githubRawUrl}`);
    }
});

function readAudios(): AudioConfig {
    if (!fs.existsSync(audiosPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(audiosPath, 'utf-8')) as AudioConfig;
    } catch (e: unknown) {
        console.error('[❌] Error leyendo audios.json:', e);
        return {};
    }
}

async function persistAudios(audios: AudioConfig): Promise<void> {
    fs.writeFileSync(audiosPath, JSON.stringify(audios, null, 2));
    await import(pathToFileURL(audiosPath).href + `?update=${Date.now()}`, {assert: {type: "json"}});
}
