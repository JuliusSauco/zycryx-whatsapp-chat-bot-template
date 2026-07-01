import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import yts from 'yt-search';

export default defineSdkPlugin({
    help: ['playlist', 'yts'],
    tags: ['downloader'],
    command: ['playvid2', 'playlist', 'playlista', 'yts', 'ytsearch'],
    register: true,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.playlist.missingQuery', {
        command: sdk.usedPrefix + sdk.command
    });
    await sdk.reply.react('📀');
    const result = await yts(sdk.text);
    const ytres = result.videos;
    if (!ytres.length) return sdk.reply.message('downloads.playlist.noResults');
    let textoo = sdk.content.renderMessage('downloads.playlist.header', {query: sdk.text});
    for (let i = 0; i < Math.min(15, ytres.length); i++) {
        const v = ytres[i];
        textoo += sdk.content.renderMessage('downloads.playlist.item', {
            title: v.title,
            ago: v.ago,
            views: v.views,
            duration: v.timestamp,
            url: v.url
        });
    }
    await sdk.sendFile(ytres[0].image, 'thumbnail.jpg', textoo);
    }
});
