import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {searchLyrics} from '../../providers/search/lyrics.provider.js';

export default defineSdkPlugin({
    help: ['lirik', 'letra'].map((v) => v + ' <Apa>'),
    tags: ['buscadores'],
    command: /^(lirik|lyrics|lyric|letra)$/i,
    register: true,
    async execute(m, {sdk}) {
    const teks = sdk.text ? sdk.text : m.quoted && m.quoted.text ? m.quoted.text : '';
    if (!teks) return sdk.reply.message('search.lyrics.missingQuery', {command: sdk.usedPrefix + sdk.command})
    try {
        const result = await searchLyrics(teks)
        const textoLetra = sdk.content.renderMessage('search.lyrics.captionPrimary', {
            title: result.title || sdk.content.message('search.lyrics.unknown'),
            artist: result.artist || sdk.content.message('search.lyrics.unknown'),
            url: result.url || sdk.content.message('search.lyrics.unavailable'),
            lyrics: result.lyrics || sdk.content.message('search.lyrics.lyricsUnavailable')
        });
        const img = result.image
        await sdk.sendFile(img, 'error,jpg', textoLetra);
    } catch (e: unknown) {
        await sdk.reply.reportableError(e)
        logInfo(e)
    }
    }
});
