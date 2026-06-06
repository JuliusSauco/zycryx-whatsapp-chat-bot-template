import {definePlugin} from '../../core/define-plugin.js';
import {getAudioConfig} from '../../services/audio-response.service.js';

export default definePlugin({
    help: ['menu2'],
    tags: ['main'],
    command: /^(menu2|audios|menú2|memu2|menuaudio|menuaudios|memuaudios|memuaudio|audios|audio)$/i,
    register: true,
    async execute(m, {conn}) {
    const taguser = '@' + m.sender.split('@')[0];
    const chatId = m.chat?.trim();
    const audios = await getAudioConfig([chatId, 'global']);
    const globalAudios = Object.keys(audios.global || {}).sort();
    const localAudios = Object.keys(audios[chatId] || {}).sort();
    const listaGlobal = globalAudios.map((v) => `* 🔊  _${v}_`).join('\n');
    const listaLocal = localAudios.map((v) => `* 🔊  _${v}_`).join('\n');

    let str = `\`Hola ${taguser} 💖彡\`

\`<MENU DE AUDIOS/>\`
> Escribe las palabras/frases tal como estan, no hace falta poner ningun prefijo (#, ., *, etc) 

${listaGlobal} ${listaLocal.length > 0 ? `\n\n---\n\n\`<LISTA LOCAL/>\`\n\n${listaLocal}` : ''}

*🅛🅞🅛🅘🅑🅞🅣-🅜🅓*`.trim();

    await conn.sendMessage(m.chat, {
        text: str,
        contextInfo: {
            mentionedJid: await conn.parseMention(str),
        }
    }, {quoted: m});
    }
});
