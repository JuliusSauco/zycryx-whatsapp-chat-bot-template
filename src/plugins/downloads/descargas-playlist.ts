import {definePlugin} from '../../core/define-plugin.js'
import yts from 'yt-search';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['playlist', 'yts'],
    tags: ['downloader'],
    command: ['playvid2', 'playlist', 'playlista', 'yts', 'ytsearch'],
    register: true,
    async execute(m, {conn, usedPrefix, text, command}) {
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.playlist.missingQuery'), {
        command: usedPrefix + command
    }));
    m.react('📀');
    let result = await yts(text);
    let ytres = result.videos;
    if (!ytres.length) return m.reply(getRequiredPluginMessage('downloads.playlist.noResults'));
    let textoo = renderTemplate(getRequiredPluginMessage('downloads.playlist.header'), {query: text});
    for (let i = 0; i < Math.min(15, ytres.length); i++) {
        let v = ytres[i];
        textoo += renderTemplate(getRequiredPluginMessage('downloads.playlist.item'), {
            title: v.title,
            ago: v.ago,
            views: v.views,
            duration: v.timestamp,
            url: v.url
        });
    }
    await conn.sendFile(m.chat, ytres[0].image, 'thumbnail.jpg', textoo, m);
    }
});
