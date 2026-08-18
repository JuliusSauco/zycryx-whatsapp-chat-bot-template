import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {identifyMusic, isAcrCloudConfigured} from '../../providers/audio-recognition/acrcloud.provider.js';

export default defineSdkPlugin({
    help: ['quemusica'],
    tags: ['tools'],
    command: /^quemusica|quemusicaes|whatmusic$/i,
    register: true,
    async execute(m, {sdk}) {
    if (!isAcrCloudConfigured()) return sdk.reply.message('tools.whatMusic.missingConfig');
    const q = m.quoted ? m.quoted : m;
    const mime = q.msg?.mimetype || q.mimetype || '';
    if (/audio|video/.test(mime)) {
        if ((q.msg?.seconds || q.seconds || 0) > 20) return sdk.reply.message('tools.whatMusic.tooLong');
        const media = await q.download();
        const res = await identifyMusic(media);
        const {code, msg} = res.status;
        if (code !== 0) throw msg;
        const music = res.metadata?.music?.[0];
        if (!music) throw sdk.content.message('tools.whatMusic.notFound');
        const {title, artists, album, genres, release_date} = music;
        const notFound = sdk.content.message('tools.whatMusic.notFound');
        const txt = sdk.content.renderMessage('tools.whatMusic.result', {
            title: title || notFound,
            artists: artists !== undefined ? artists.map((v) => v.name).join(', ') : notFound,
            album: album?.name || notFound,
            genres: genres !== undefined ? genres.map((v) => v.name).join(', ') : notFound,
            releaseDate: release_date || notFound,
        });
        await sdk.reply.text(txt);
    } else throw sdk.content.message('tools.whatMusic.missingAudio');
    }
});
