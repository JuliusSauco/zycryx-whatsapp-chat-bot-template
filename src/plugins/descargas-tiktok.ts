import {definePlugin} from '../core/define-plugin.js'
import fg from 'api-dylux';
import axios from 'axios';
import cheerio from 'cheerio';

interface TikTokMedia {
    type?: string
    org?: string
    hd?: string
    wm?: string
}

interface TikDownResponse {
    status?: boolean
    html?: string
}

const userRequests: Record<string, boolean> = {};

export default definePlugin({
    help: ['tiktok'],
    tags: ['downloader'],
    command: /^(tt|tiktok)(dl|nowm)?$/i,
    limit: 1,
    async execute(m, {conn, text, args, usedPrefix, command}) {
    if (!text) return m.reply(`⚠️ *Que tiktok buscar? 🤔*\n\n⚡ *Ingrese un enlace de tiktok para descarga el video*\n*Ej:* ${usedPrefix + command} https://vm.tiktok.com/ZM6T4X1RY/`)
    if (!/(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)) return m.reply(`❌ Error`)
    if (userRequests[m.sender]) return await conn.reply(m.chat, `Oye @${m.sender.split('@')[0]}, calma bro, ya estás descargando algo 😒\n> Espera a que termine tu solicitud actual antes de hacer otra...`, m)
    userRequests[m.sender] = true;
    const {key} = await conn.sendMessage(m.chat, {text: `⌛ 𝙀𝙨𝙥𝙚𝙧𝙚 ✋\n▰▰▰▱▱▱▱▱▱\n𝙔𝙖 𝙚𝙨𝙩𝙤𝙮 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙙𝙤... 𝙨𝙪𝙨 𝙫𝙞𝙙𝙚𝙤 𝙙𝙚𝙡 𝙏𝙞𝙠𝙏𝙤𝙠 🔰`}, {quoted: m});
    await delay(1000);
    await conn.sendMessage(m.chat, {
        text: `⌛ 𝙀𝙨𝙥𝙚𝙧𝙚 ✋ \n▰▰▰▰▰▱▱▱▱\n𝙔𝙖 𝙚𝙨𝙩𝙤𝙮 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙙𝙤... 𝙨𝙪𝙨 𝙫𝙞𝙙𝙚𝙤 𝙙𝙚𝙡 𝙏𝙞𝙠𝙏𝙤𝙠 🔰`,
        edit: key
    });
    await delay(1000);
    await conn.sendMessage(m.chat, {text: `⌛ 𝙔𝙖 𝙘𝙖𝙨𝙞 🏃‍♂️💨\n▰▰▰▰▰▰▰▱▱`, edit: key});
    try {
        const downloadAttempts = [async () => {
            const tTiktok = await tiktokdlF(args[0]);
            return tTiktok.video;
        },
            async () => {
                const {data} = await axios.get(`https://api.delirius.store/download/tiktok?url=${args[0]}`);
                const video = (data?.data?.meta?.media as TikTokMedia[] | undefined)?.find(media => media.type === 'video');
                return video?.org || video?.hd || video?.wm;
            },
            async () => {
                const response = await axios.get(`https://api.dorratz.com/v2/tiktok-dl?url=${args[0]}`);
                return response.data.data.media.org;
            },
            async () => {
                const p = await fg.tiktok(args[0]);
                return p.nowm;
            }];

        let videoUrl = null;
        for (const attempt of downloadAttempts) {
            try {
                videoUrl = await attempt();
                if (videoUrl) break;
            } catch (err: unknown) {
                console.error(`Error in attempt: ${err instanceof Error ? err.message : String(err)}`);
                continue; // Si falla, intentar con la siguiente API
            }
        }

        if (!videoUrl) throw new Error('No se pudo descargar el video desde ninguna API');
        await conn.sendFile(m.chat, videoUrl, 'tt.mp4', '*🔰 Aqui esta tu video de tiktok*', m);
//conn.sendMessage(m.chat, {video: { url: videoUrl }, caption: `*🔰 Aqui esta tu video de tiktok*` }, { quoted: m });
        await conn.sendMessage(m.chat, {text: `✅ 𝘾𝙤𝙢𝙥𝙡𝙚𝙩𝙖𝙙𝙤\n▰▰▰▰▰▰▰▰▰`, edit: key});
    } catch (e: unknown) {
        console.log(e);
        m.react(`❌`);
    } finally {
        delete userRequests[m.sender];
    }
    }
});

;

const delay = (time: number) => new Promise(res => setTimeout(res, time));

async function tiktokdlF(url: string) {
    if (!/tiktok/.test(url)) throw new Error(`URL de TikTok inválida`);
    const gettoken = await axios.get('https://tikdown.org/id');
    const $ = cheerio.load(gettoken.data);
    const token = $('#download-form > input[type=hidden]:nth-child(2)').attr('value');
    const param = {url, _token: token || ''};
    const {data} = await axios.post<TikDownResponse>('https://tikdown.org/getAjax?', new URLSearchParams(Object.entries(param)), {
        headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
        }
    });
    const getdata = cheerio.load(data.html || '');
    if (data.status) {
        return {
            status: true,
            thumbnail: getdata('img').attr('src'),
            video: getdata('div.download-links > div:nth-child(1) > a').attr('href'),
            audio: getdata('div.download-links > div:nth-child(2) > a').attr('href')
        };
    } else {
        return {status: false};
    }
}
