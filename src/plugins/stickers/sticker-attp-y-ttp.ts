import {sticker} from '../../lib/sticker.js'
import fetch from 'node-fetch'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {definePlugin} from '../../core/define-plugin.js';

interface NeoxrStickerResponse {
    status?: boolean;
    data?: {
        url?: string;
    };
}

export default definePlugin({
    help: ['attp', 'brat', 'bratvid'],
    tags: ['sticker'],
    command: /^(attp|ttp|ttp2|ttp3|ttp4|attp2|brat|brat2|bratvid)$/i,
    register: true,
    async execute(m, {conn, text, args, usedPrefix, command}) {
    const {packname: f, author: g} = await getStickerExif(m.sender);
    if (!text) return m.reply(`⚠️ 𝙀𝙨𝙘𝙧𝙞𝙗𝙖 𝙥𝙖𝙧𝙖 𝙦𝙪𝙚 𝙚𝙡 𝙩𝙚𝙭𝙩𝙤 𝙨𝙚 𝙘𝙤𝙣𝙫𝙞𝙚𝙧𝙩𝙖 𝙚𝙡 𝙨𝙩𝙞𝙘𝙠𝙚𝙧\n𝙀𝙟𝙚𝙢𝙥𝙡𝙤\n*${usedPrefix + command}* Nuevo Sticker`)
    let teks = encodeURI(text)
    conn.fakeReply(m.chat, `Calma crack estoy haciendo tu texto a sticker 👏\n\n> *Esto puede demorar unos minutos*`, '0@s.whatsapp.net', `No haga spam gil`, 'status@broadcast')

    const sendSticker = async (url: string) => {
        let stiker = await sticker(null, url, f, g)
        await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
            contextInfo: {
                'forwardingScore': 200,
                'isForwarded': false,
                externalAdReply: {
                    showAdAttribution: false,
                    title: info.wm,
                    body: info.vs,
                    mediaType: 2,
                    sourceUrl: info.md,
                    thumbnail: m.pp
                }
            }
        })
    }

    const getApiStickerUrl = async (url: string) => {
        const res = await fetch(url)
        const json = await res.json() as NeoxrStickerResponse
        if (!json.status || !json.data?.url) return null
        return json.data.url
    }

    if (command == 'attp') {
        if (text.length > 40) return m.reply(`⚠️ El texto no puede tener más de 40 caracteres.\n\n✍️ Intenta con algo más corto.`)
//let stiker = await sticker(null,`${info.fgmods.url}/maker/attp?text=${teks}&apikey=${info.fgmods.key}`, f, g)
        const url = await getApiStickerUrl(`https://api.neoxr.eu/api/attp?text=${teks}%21&color=%5B%22%23FF0000%22%2C+%22%2300FF00%22%2C+%22%230000FF%22%5D&apikey=${info.neoxr.key}`)
        if (!url) return m.reply('Ufff la puta api se cayo 😒 pura mamada vuelve intentarlo mas tarde')
        await sendSticker(url)
    }

    if (command == 'ttp' || command == 'brat') {
        if (text.length > 300) return m.reply(`⚠️ El texto no puede tener más de 300 caracteres.\n\n✍️ Intenta con algo más corto.`)
        const url = await getApiStickerUrl(`https://api.neoxr.eu/api/brat?text=${teks}&apikey=${info.neoxr.key}`)
        if (!url) return m.reply('Ufff la puta api se cayo 😒 pura mamada vuelve intentarlo mas tarde')
        await sendSticker(url)
    }

    if (command == 'brat2' || command == 'bratvid') {
        if (text.length > 250) return m.reply(`⚠️ El texto no puede tener más de 250 caracteres.\n\n✍️ Intenta con algo más corto.`)
        const url = await getApiStickerUrl(`https://api.neoxr.eu/api/bratvid?text=${teks}&apikey=${info.neoxr.key}`)
        if (!url) return m.reply('Ufff la puta api se cayo 😒 pura mamada vuelve intentarlo mas tarde')
        await sendSticker(url)
    }
    }
})
