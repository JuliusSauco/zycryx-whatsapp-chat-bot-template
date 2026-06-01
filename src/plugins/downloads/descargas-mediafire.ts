import {definePlugin} from '../../core/define-plugin.js'
import fetch from 'node-fetch';
import type {QuotedMessage} from '../../types/context.js';
//import cheerio from 'cheerio';
//import { mediafiredl } from '@bochilteam/scraper';

let free = 150;
let prem = 500;
interface MediafireFileData {
    url: string
    filename: string
    filesize?: string
    mimetype?: string
}

interface MediafireArrayResponse {
    data?: Array<{
        link?: string
        filename?: string
        nama?: string
        size?: string
        mime?: string
    }>
}

interface NeoxrMediafireResponse {
    status?: boolean
    data?: {
        url?: string
        title?: string
        size?: string
        mime?: string
    }
}

const userCaptions = new Map<string, QuotedMessage>();
const userRequests: Record<string, boolean> = {};

export default definePlugin({
    help: ['mediafire', 'mediafiredl'],
    tags: ['downloader'],
    command: /^(mediafire|mediafiredl|dlmediafire)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, usedPrefix, command}) {
    const sticker = 'https://qu.ax/Wdsb.webp';
    if (!args[0]) return m.reply(`⚠️ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙪𝙣 𝙀𝙣𝙡𝙖𝙘𝙚 𝙫𝙖𝙡𝙞𝙙𝙤 𝙙𝙚𝙡 𝙢𝙚𝙙𝙞𝙖𝙛𝙞𝙧𝙚 𝙀𝙟:*\n${usedPrefix + command} https://www.mediafire.com/file/sd9hl31vhhzf76v/EvolutionV1.1-beta_%2528Recomendado%2529.apk/file`)

    if (userRequests[m.sender]) return await conn.reply(m.chat, `⚠️ Hey @${m.sender.split('@')[0]} pendejo, ya estás descargando algo 🙄\nEspera a que termine tu solicitud actual antes de hacer otra...`, userCaptions.get(m.sender) || m);
    userRequests[m.sender] = true;
    m.react(`🚀`);
    try {
        const downloadAttempts: Array<() => Promise<MediafireFileData>> = [
            async () => {
                const res = await fetch(`https://api.delirius.store/download/mediafire?url=${args[0]}`);
                const data = await res.json() as MediafireArrayResponse;
                const file = data.data?.[0];
                if (!file?.link || !file.filename) throw new Error('Respuesta inválida de Delirius');
                return {
                    url: file.link,
                    filename: file.filename,
                    filesize: file.size,
                    mimetype: file.mime
                }
            },
            async () => {
                const res = await fetch(`${info.neoxr.url}/mediafire?url=${args[0]}&apikey=${info.neoxr.key}`);
                const data = await res.json() as NeoxrMediafireResponse;
                if (!data.status || !data.data) throw new Error('Error en Neoxr');
                if (!data.data.url || !data.data.title) throw new Error('Respuesta inválida de Neoxr');
                return {
                    url: data.data.url,
                    filename: data.data.title,
                    filesize: data.data.size,
                    mimetype: data.data.mime
                }
            },
            async () => {
                const res = await fetch(`https://api.agatz.xyz/api/mediafire?url=${args[0]}`);
                const data = await res.json() as MediafireArrayResponse;
                const file = data.data?.[0];
                if (!file?.link || !file.nama) throw new Error('Respuesta inválida de Agatz');
                return {
                    url: file.link,
                    filename: file.nama,
                    filesize: file.size,
                    mimetype: file.mime
                }
            },
            async () => {
                const res = await fetch(`https://api.siputzx.my.id/api/d/mediafire?url=${args[0]}`);
                const data = await res.json() as MediafireArrayResponse;
                const file = data.data?.[0];
                if (!file?.link || !file.filename) throw new Error('Respuesta inválida de Siputz');
                return {
                    url: file.link,
                    filename: file.filename,
                    filesize: file.size,
                    mimetype: file.mime
                };
            }
        ];

        let fileData = null;

        for (const attempt of downloadAttempts) {
            try {
                fileData = await attempt();
                if (fileData) break;
            } catch (err: unknown) {
                console.error(`Error in attempt: ${err instanceof Error ? err.message : String(err)}`);
                continue; // Si falla, intentar con la siguiente API
            }
        }

        if (!fileData) throw new Error('No se pudo descargar el archivo desde ninguna API');
        const file = Array.isArray(fileData) ? fileData[0] : fileData;
        const caption = `┏━━『 𝐌𝐄𝐃𝐈𝐀𝐅𝐈𝐑𝐄 』━━•
┃❥ 𝐍𝐨𝐦𝐛𝐫𝐞 : ${file.filename}
┃❥ 𝐏𝐞𝐬𝐨 : ${file.filesize}
┃❥ 𝐓𝐢𝐩𝐨 : ${file.mimetype}
╰━━━⊰ 𓃠 ${info.vs} ⊱━━━━•
> ⏳ ᴱˢᵖᵉʳᵉ ᵘⁿ ᵐᵒᵐᵉⁿᵗᵒ ᵉⁿ ˡᵒˢ ᵠᵘᵉ ᵉⁿᵛᶦᵒˢ ˢᵘˢ ᵃʳᶜʰᶦᵛᵒˢ`.trim();
        const captionMessage = await conn.reply(m.chat, caption, m)
        userCaptions.set(m.sender, captionMessage);
        await conn.sendFile(m.chat, file.url, file.filename, '', m, undefined, {mimetype: file.mimetype, asDocument: true});
        m.react('✅');
    } catch (e: unknown) {
        await conn.sendFile(m.chat, sticker, 'error.webp', '', m);
        m.react('❌');
        console.error(e);
    } finally {
        delete userRequests[m.sender];
    }
    }
});

;
