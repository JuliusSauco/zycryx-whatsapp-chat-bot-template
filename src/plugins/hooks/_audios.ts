import path from 'path';
import {logError} from '../../lib/logger.js';
import {findMatchingAudioInScopes} from '../../services/audio-response.service.js';
import type {BeforePluginContext} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';
import {pickRandom} from '../../utils/random.js';
import {canUseAccessMode} from '../../utils/access-mode.js';
import {defaultFamilyAccess} from '../../utils/family-access.js';

export async function before(m: BotMessage, {conn, botConfig, groupSettings, isOwner, isAdmin, isGroupCreator}: BeforePluginContext) {
    if (!m || m.fromMe || !m.originalText || m.originalText.length > 500) return;
    const prefixes = Array.isArray(botConfig?.prefix) ? botConfig.prefix : ['.', '/', '#'];
    const texto = m.originalText.trim();

    if (prefixes.some((p) => texto.startsWith(p))) return;
    const audioRule = groupSettings?.familyAccess?.audio || defaultFamilyAccess('audio');
    if (!audioRule.enabled || !canUseAccessMode(audioRule.accessMode, {isOwner, isAdmin, isGroupCreator})) return;

    const lowerTexto = texto.toLowerCase();
    const chatId = m.chat.trim();
    const audio = await findMatchingAudioInScopes([chatId, 'global'], lowerTexto);
    if (!audio) return;

    try {
        await conn.sendPresenceUpdate('recording', m.chat);
        const listaAudios = audio.audios?.length ? audio.audios : audio.audio ? [audio.audio] : [];
        const elegido = pickRandom(listaAudios);
        if (!elegido) return;

        await conn.sendMessage(m.chat, {
            audio: elegido.startsWith('data:audio/') ? Buffer.from(elegido.split(',')[1], 'base64') : elegido.startsWith('./') || elegido.startsWith('/') ? {url: path.resolve(elegido)} : {url: elegido},
            mimetype: 'audio/mpeg'
        }, {quoted: m});
    } catch (err: unknown) {
        logError('[❌] Error enviando audio automático:', err);
    }
}
