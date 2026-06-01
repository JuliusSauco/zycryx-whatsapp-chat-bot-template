import {definePlugin} from '../../core/define-plugin.js'
import yts from 'yt-search';

export default definePlugin({
    help: ['playlist', 'yts'],
    tags: ['downloader'],
    command: ['playvid2', 'playlist', 'playlista', 'yts', 'ytsearch'],
    register: true,
    async execute(m, {conn, usedPrefix, text, command}) {
    if (!text) return m.reply(`*¿Qué está buscando?* Ingrese el nombre del tema\n*• Ejemplo*\n*${usedPrefix + command}* bad bunny`);
    m.react('📀');
    let result = await yts(text);
    let ytres = result.videos;
    if (!ytres.length) return m.reply('❌ No se encontraron resultados.');
    let textoo = `*• Resultados de:*  ${text}\n\n`;
    for (let i = 0; i < Math.min(15, ytres.length); i++) {
        let v = ytres[i];
        textoo += `🎵 *Título:* ${v.title}\n📆 *Publicado hace:* ${v.ago}\n👀 *Vistas:* ${v.views}\n⌛ *Duración:* ${v.timestamp}\n🔗 *Enlace:* ${v.url}\n\n⊱ ────── {.⋅ ♫ ⋅.} ───── ⊰\n\n`;
    }
    await conn.sendFile(m.chat, ytres[0].image, 'thumbnail.jpg', textoo, m);
    }
});
