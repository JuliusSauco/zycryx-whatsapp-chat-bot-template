import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

interface LyricsResult {
    title?: string;
    artist?: string;
    artistUrl?: string;
    url?: string;
    image?: string;
    lyrics?: string;
}

interface FgmodsLyricsResponse {
    result?: LyricsResult;
}

interface ApiLyricsResponse {
    status?: string;
    data?: LyricsResult;
}

export default defineSdkPlugin({
    help: ['lirik', 'letra'].map((v) => v + ' <Apa>'),
    tags: ['buscadores'],
    command: /^(lirik|lyrics|lyric|letra)$/i,
    register: true,
    async execute(m, {sdk}) {
    const teks = sdk.text ? sdk.text : m.quoted && m.quoted.text ? m.quoted.text : '';
    if (!teks) return sdk.reply.message('search.lyrics.missingQuery', {command: sdk.usedPrefix + sdk.command})
    try {
        const data = await sdk.http.json<FgmodsLyricsResponse>(`https://api.fgmods.xyz/api/other/lyrics?text=${encodeURIComponent(teks)}&apikey=${info.fgmods.key}`)
        if (!data.result) throw new Error('Sin resultado de lyrics')
        const textoLetra = sdk.content.renderMessage('search.lyrics.captionPrimary', {
            title: data.result.title || sdk.content.message('search.lyrics.unknown'),
            artist: data.result.artist || sdk.content.message('search.lyrics.unknown'),
            url: data.result.url || sdk.content.message('search.lyrics.unavailable'),
            lyrics: data.result.lyrics || sdk.content.message('search.lyrics.lyricsUnavailable')
        });
        const img = data.result.image
        await sdk.sendFile(img, 'error,jpg', textoLetra);
    } catch (e: unknown) {
        try {
            const data = await sdk.http.json<ApiLyricsResponse>(`${info.apis}/search/letra?query=${encodeURIComponent(teks)}`);
            if (data.status !== "200" || !data.data) return sdk.reply.message('search.lyrics.notFound');

            const textoLetra = sdk.content.renderMessage('search.lyrics.captionFallback', {
                title: data.data.title || sdk.content.message('search.lyrics.unknown'),
                artist: data.data.artist || sdk.content.message('search.lyrics.unknown'),
                artistUrl: data.data.artistUrl || sdk.content.message('search.lyrics.unavailable'),
                url: data.data.url || sdk.content.message('search.lyrics.unavailable'),
                lyrics: data.data.lyrics || sdk.content.message('search.lyrics.lyricsUnavailable')
            });
            const img = data.data.image
            await sdk.sendFile(img, 'error,jpg', textoLetra);
//conn.sendMessage(m.chat, { image: { url: img }, caption: textoLetra }, { quoted: m });
        } catch (e: unknown) {
            await sdk.reply.reportableError(e)
            logInfo(e)
        }
    }
    }
});
