import {getGroupSettings} from '../services/group-settings.service.js';
import {getSubbotConfig} from '../services/subbot.service.js';
import fs from 'fs';
import path from 'path';
import type {ExtendedConn} from '../types/context.js';
import type {BotMessage} from '../types/message.js';

const audiosPath = path.resolve('./src/audios.json');

interface AudioEntry {
    regex: string;
    audio?: string;
    audios?: string[];
}

type AudioConfig = Record<string, Record<string, AudioEntry>>;

function getAudios(): AudioConfig {
    try {
        return JSON.parse(fs.readFileSync(audiosPath, 'utf-8')) as AudioConfig;
    } catch (e: unknown) {
        console.error('[❌] Error leyendo audios.json dinámicamente:', e);
        return {};
    }
}

export async function before(m: BotMessage, {conn}: {conn: ExtendedConn}) {
    if (!m || m.fromMe || !m.originalText || m.originalText.length > 500) return;
    const botId = conn?.user?.id?.replace(/:\d+/, "") || "";
    const config = await getSubbotConfig(botId);
    const prefixes = Array.isArray(config?.prefix) ? config.prefix : ['.', '/', '#'];
    const texto = m.originalText.trim();

    if (prefixes.some((p) => texto.startsWith(p))) return;
    try {
        const settings = await getGroupSettings(m.chat);
        if (!settings?.audios) return;
    } catch (e: unknown) {
        console.error('[❌] Error al consultar configuración de audios:', e);
        return;
    }

    const lowerTexto = texto.toLowerCase();
    const chatId = m.chat.trim();
    const audios = getAudios();
    const sources = [audios[chatId], audios.global].filter((source): source is Record<string, AudioEntry> => Boolean(source));

    for (const source of sources) {
        const clave = Object.keys(source).find(k => {
            try {
                const regex = new RegExp(source[k].regex, 'i');
                const matches = lowerTexto.match(regex);
                return matches?.[0]?.length === lowerTexto.length;
            } catch {
                return false;
            }
        });

        if (!clave) continue;

        const audio = source[clave];
        try {
            await conn.sendPresenceUpdate('recording', m.chat);
            const listaAudios = audio.audios?.length ? audio.audios : audio.audio ? [audio.audio] : [];
            const elegido = listaAudios[Math.floor(Math.random() * listaAudios.length)];
            if (!elegido) continue;

            await conn.sendMessage(m.chat, {
                audio: elegido.startsWith('data:audio/') ? Buffer.from(elegido.split(',')[1], 'base64') : elegido.startsWith('./') || elegido.startsWith('/') ? {url: path.resolve(elegido)} : {url: elegido},
                mimetype: 'audio/mpeg'
            }, {quoted: m});
            break;
        } catch (err: unknown) {
            console.error('[❌] Error enviando audio automático:', err);
        }
    }
}
