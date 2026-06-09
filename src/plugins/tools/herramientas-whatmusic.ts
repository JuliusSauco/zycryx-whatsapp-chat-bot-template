import fs from 'fs';
import acrcloud from 'acrcloud';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {ENV} from '../../core/env.js';

interface AcrArtist {
    name: string;
}

interface AcrGenre {
    name: string;
}

interface AcrMusicResult {
    title?: string;
    artists?: AcrArtist[];
    album?: {
        name?: string;
    };
    genres?: AcrGenre[];
    release_date?: string;
}

interface AcrIdentifyResult {
    status: {
        code: number;
        msg: string;
    };
    metadata?: {
        music?: AcrMusicResult[];
    };
}

function createAcrClient() {
    if (!ENV.ACR_ACCESS_KEY || !ENV.ACR_ACCESS_SECRET) return null;
    return new acrcloud({
        host: ENV.ACR_HOST,
        access_key: ENV.ACR_ACCESS_KEY,
        access_secret: ENV.ACR_ACCESS_SECRET,
    });
}

export default defineSdkPlugin({
    help: ['quemusica'],
    tags: ['tools'],
    command: /^quemusica|quemusicaes|whatmusic$/i,
    register: true,
    async execute(m, {sdk}) {
    const acr = createAcrClient();
    if (!acr) return sdk.reply.message('tools.whatMusic.missingConfig');
    const q = m.quoted ? m.quoted : m;
    const mime = q.msg?.mimetype || q.mimetype || '';
    if (/audio|video/.test(mime)) {
        if ((q.msg?.seconds || q.seconds || 0) > 20) return sdk.reply.message('tools.whatMusic.tooLong');
        const media = await q.download();
        const ext = mime.split('/')[1];
        fs.writeFileSync(`./tmp/${m.sender}.${ext}`, media);
        const res = await acr.identify(fs.readFileSync(`./tmp/${m.sender}.${ext}`)) as AcrIdentifyResult;
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
        fs.unlinkSync(`./tmp/${m.sender}.${ext}`);
        await sdk.reply.text(txt);
    } else throw sdk.content.message('tools.whatMusic.missingAudio');
    }
});
