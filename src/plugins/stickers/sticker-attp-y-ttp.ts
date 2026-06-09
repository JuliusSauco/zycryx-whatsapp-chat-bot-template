import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import {httpJson} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

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
    async execute(m, {conn, text, usedPrefix, command}) {
    const {packname: f, author: g} = await getStickerExif(m.sender);
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('stickers.text.usage'), {command: usedPrefix + command}))
    let teks = encodeURI(text)
    conn.fakeReply(m.chat, getRequiredPluginMessage('stickers.text.processing'), '0@s.whatsapp.net', getRequiredPluginMessage('stickers.text.quoted'), 'status@broadcast')

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
        const json = await httpJson<NeoxrStickerResponse>(url)
        if (!json.status || !json.data?.url) return null
        return json.data.url
    }

    if (command == 'attp') {
        if (text.length > 40) return m.reply(getRequiredPluginMessage('stickers.text.tooLong40'))
//let stiker = await sticker(null,`${info.fgmods.url}/maker/attp?text=${teks}&apikey=${info.fgmods.key}`, f, g)
        const url = await getApiStickerUrl(`https://api.neoxr.eu/api/attp?text=${teks}%21&color=%5B%22%23FF0000%22%2C+%22%2300FF00%22%2C+%22%230000FF%22%5D&apikey=${info.neoxr.key}`)
        if (!url) return m.reply(getRequiredPluginMessage('stickers.text.apiDown'))
        await sendSticker(url)
    }

    if (command == 'ttp' || command == 'brat') {
        if (text.length > 300) return m.reply(getRequiredPluginMessage('stickers.text.tooLong300'))
        const url = await getApiStickerUrl(`https://api.neoxr.eu/api/brat?text=${teks}&apikey=${info.neoxr.key}`)
        if (!url) return m.reply(getRequiredPluginMessage('stickers.text.apiDown'))
        await sendSticker(url)
    }

    if (command == 'brat2' || command == 'bratvid') {
        if (text.length > 250) return m.reply(getRequiredPluginMessage('stickers.text.tooLong250'))
        const url = await getApiStickerUrl(`https://api.neoxr.eu/api/bratvid?text=${teks}&apikey=${info.neoxr.key}`)
        if (!url) return m.reply(getRequiredPluginMessage('stickers.text.apiDown'))
        await sendSticker(url)
    }
    }
})
