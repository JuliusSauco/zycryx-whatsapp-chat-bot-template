import fs from 'fs';
import acrcloud from 'acrcloud';
import {definePlugin} from '../../core/define-plugin.js';
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

export default definePlugin({
    help: ['quemusica'],
    tags: ['tools'],
    command: /^quemusica|quemusicaes|whatmusic$/i,
    register: true,
    async execute(m) {
    const acr = createAcrClient();
    if (!acr) return m.reply('❌ ACRCloud no está configurado. Define ACR_ACCESS_KEY y ACR_ACCESS_SECRET.');
    const q = m.quoted ? m.quoted : m;
    const mime = q.msg?.mimetype || q.mimetype || '';
    if (/audio|video/.test(mime)) {
        if ((q.msg?.seconds || q.seconds || 0) > 20) return m.reply('⚠️ ᴇʟ ᴀʀᴄʜɪᴠᴏ ǫᴜᴇ ᴄᴀʀɢᴀ ᴇs ᴅᴇᴍᴀsɪᴀᴅᴏ ɢʀᴀɴᴅᴇ, ʟᴇ sᴜɢᴇʀɪᴍᴏs ǫᴜᴇ ᴄᴏʀᴛᴇ ᴇʟ ᴀʀᴄʜɪᴠᴏ ɢʀᴀɴᴅᴇ ᴀ ᴜɴ ᴀʀᴄʜɪᴠᴏ ᴍᴀ́s ᴘᴇǫᴜᴇɴ̃ᴏ, 10-20 sᴇɢᴜɴᴅᴏs ʟᴏs ᴅᴀᴛᴏs ᴅᴇ ᴀᴜᴅɪᴏ sᴏɴ sᴜғɪᴄɪᴇɴᴛᴇs ᴘᴀʀᴀ ɪᴅᴇɴᴛɪғɪᴄᴀʀ');
        const media = await q.download();
        const ext = mime.split('/')[1];
        fs.writeFileSync(`./tmp/${m.sender}.${ext}`, media);
        const res = await acr.identify(fs.readFileSync(`./tmp/${m.sender}.${ext}`)) as AcrIdentifyResult;
        const {code, msg} = res.status;
        if (code !== 0) throw msg;
        const music = res.metadata?.music?.[0];
        if (!music) throw 'No encontrado';
        const {title, artists, album, genres, release_date} = music;
        const txt = `*\`RESULTADOS DE LA BÚSQUEDA*\`

• 📌 𝐓𝐢𝐭𝐮𝐥𝐨: ${title}
• 👨‍🎤 𝐀𝐫𝐭𝐢𝐬𝐭𝐚: ${artists !== undefined ? artists.map((v) => v.name).join(', ') : 'No encontrado'}
• 💾 𝐀𝐥𝐛𝐮𝐦: ${album?.name || 'No encontrado'}
• 🌐 𝐆𝐞𝐧𝐞𝐫𝐨: ${genres !== undefined ? genres.map((v) => v.name).join(', ') : 'No encontrado'}
• 📆 𝐅𝐞𝐜𝐡𝐚 𝐝𝐞 𝐥𝐚𝐧𝐳𝐚𝐦𝐢𝐞𝐧𝐭𝐨: ${release_date || 'No encontrado'}
`.trim();
        fs.unlinkSync(`./tmp/${m.sender}.${ext}`);
        m.reply(txt);
    } else throw '*⚠️ 𝐑𝐞𝐬𝐩𝐨𝐧𝐝𝐞 𝐚 𝐮𝐧 𝐚𝐮𝐝𝐢𝐨*';
    }
});
