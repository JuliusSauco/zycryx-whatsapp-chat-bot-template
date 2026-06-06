import path from 'path';
import {logError} from '../../lib/logger.js';
import {getAudioConfig, type AudioEntry} from '../../services/audio-response.service.js';
import type {BeforePluginContext} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';
import {pickRandom} from '../../utils/random.js';

export async function before(m: BotMessage, {conn, botConfig, groupSettings}: BeforePluginContext) {
    if (!m || m.fromMe || !m.originalText || m.originalText.length > 500) return;
    const prefixes = Array.isArray(botConfig?.prefix) ? botConfig.prefix : ['.', '/', '#'];
    const texto = m.originalText.trim();

    if (prefixes.some((p) => texto.startsWith(p))) return;
    if (!groupSettings?.audios) return;

    const lowerTexto = texto.toLowerCase();
    const chatId = m.chat.trim();
    const audios = await getAudioConfig([chatId, 'global']);
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
            const elegido = pickRandom(listaAudios);
            if (!elegido) continue;

            await conn.sendMessage(m.chat, {
                audio: elegido.startsWith('data:audio/') ? Buffer.from(elegido.split(',')[1], 'base64') : elegido.startsWith('./') || elegido.startsWith('/') ? {url: path.resolve(elegido)} : {url: elegido},
                mimetype: 'audio/mpeg'
            }, {quoted: m});
            break;
        } catch (err: unknown) {
            logError('[❌] Error enviando audio automático:', err);
        }
    }
}
