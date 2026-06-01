import {definePlugin} from '../../core/define-plugin.js'
import fg from 'api-dylux';
import fetch from 'node-fetch';

interface FacebookMediaData {
    type: 'video' | 'image'
    url: string
    caption: string
}

interface AgatzFacebookResponse {
    data?: {
        hd?: string
        sd?: string
        thumbnail?: string
    }
}

interface FgmodsFacebookResponse {
    result?: Array<{
        hd?: string
        sd?: string
    }>
}

interface DeliusFacebookResponse {
    urls?: Array<{
        hd?: string
        sd?: string
    }>
}

interface DorratzFacebookResponse {
    result?: {
        hd?: string
        sd?: string
    }
}

const userRequests: Record<string, boolean> = {};

export default definePlugin({
    help: ['fb', 'facebook', 'fbdl'],
    tags: ['downloader'],
    command: /^(facebook|fb|facebookdl|fbdl|facebook2|fb2|facebookdl2|fbdl2|facebook3|fb3|facebookdl3|fbdl3|facebook4|fb4|facebookdl4|fbdl4|facebook5|fb5|facebookdl5|fbdl5)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, command, usedPrefix}) {
    if (!args[0]) return m.reply(`⚠️ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙁𝙖𝙘𝙚𝙗𝙤𝙤𝙠 𝙥𝙖𝙧𝙖 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙚𝙡 𝙑𝙞𝙙𝙚𝙤\n• *𝙀𝙟 :* ${usedPrefix + command} https://www.facebook.com/share/r/1E1RojVvdJ/`)
    if (!args[0].match(/www.facebook.com|fb.watch/g)) return m.reply(`⚠️ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙁𝙖𝙘𝙚𝙗𝙤𝙤𝙠 𝙥𝙖𝙧𝙖 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙚𝙡 𝙑𝙞𝙙𝙚𝙤\n• *𝙀𝙟 :* ${usedPrefix + command} https://www.facebook.com/share/r/1E1RojVvdJ/`)
    if (userRequests[m.sender]) return await conn.reply(m.chat, `⚠️ Hey @${m.sender.split('@')[0]} Calmao, ya estás bajando un video 🙄\nEspera a que termine tu descarga actual antes de pedir otra...`, m)
    userRequests[m.sender] = true;
    m.react(`⌛`);
    try {
        const downloadAttempts: Array<() => Promise<FacebookMediaData | undefined>> = [async () => {
            const api = await fetch(`https://api.agatz.xyz/api/facebook?url=${args[0]}`);
            const data = await api.json() as AgatzFacebookResponse;
            const videoUrl = data.data?.hd || data.data?.sd;
            const imageUrl = data.data?.thumbnail;
            if (videoUrl && videoUrl.endsWith('.mp4')) {
                return {type: 'video', url: videoUrl, caption: '✅ Aquí está tu video de Facebook'};
            } else if (imageUrl && (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.png'))) {
                return {type: 'image', url: imageUrl, caption: '✅ Aquí está la imagen de Facebook'};
            }
        },
            async () => {
                const api = await fetch(`${info.fgmods.url}/downloader/fbdl?url=${args[0]}&apikey=${info.fgmods.key}`);
                const data = await api.json() as FgmodsFacebookResponse;
                const downloadUrl = data.result?.[0]?.hd || data.result?.[0]?.sd;
                if (!downloadUrl) throw new Error('Respuesta inválida de Fgmods');
                return {type: 'video', url: downloadUrl, caption: '✅ Aquí está tu video de Facebook'};
            },
            async () => {
                const apiUrl = `${info.apis}/download/facebook?url=${args[0]}`;
                const apiResponse = await fetch(apiUrl);
                const delius = await apiResponse.json() as DeliusFacebookResponse;
                const downloadUrl = delius.urls?.[0]?.hd || delius.urls?.[0]?.sd;
                if (!downloadUrl) throw new Error('Respuesta inválida de API principal');
                return {type: 'video', url: downloadUrl, caption: '✅ Aquí está tu video de Facebook'};
            },
            async () => {
                const apiUrl = `https://api.dorratz.com/fbvideo?url=${encodeURIComponent(args[0])}`;
                const response = await fetch(apiUrl);
                const data = await response.json() as DorratzFacebookResponse;
                const downloadUrl = data.result?.hd || data.result?.sd;
                if (!downloadUrl) throw new Error('Respuesta inválida de Dorratz');
                return {type: 'video', url: downloadUrl, caption: '✅ Aquí está tu video de Facebook'};
            },
            async () => {
                const ress = await fg.fbdl(args[0]);
                const urll = ress.data[0].url;
                return {
                    type: 'video',
                    url: urll,
                    caption: '✅ 𝐀𝐐𝐔𝐈 𝐄𝐒𝐓𝐀 𝐓𝐔 𝐕𝐈𝐃𝐄𝐎 𝐃𝐄 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊\n\n'
                };
            }];

        let mediaData = null;
        for (const attempt of downloadAttempts) {
            try {
                mediaData = await attempt();
                if (mediaData) break;
            } catch (err: unknown) {
                console.error(`Error in attempt: ${err instanceof Error ? err.message : String(err)}`);
                continue;
            }
        }

        if (!mediaData) throw new Error('No se pudo descargar el video o imagen desde ninguna API');
        const fileName = mediaData.type === 'video' ? 'video.mp4' : 'thumbnail.jpg';
        await conn.sendFile(m.chat, mediaData.url, fileName, mediaData.caption, m);
        m.react('✅');
    } catch (e: unknown) {
        m.react('❌');
        console.log(e);
    } finally {
        delete userRequests[m.sender];
    }
    }
});



//handler.limit = 3;
