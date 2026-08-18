import {botInfo} from "../../core/config.js";
import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getTextStickerUrl, type TextStickerKind} from '../../providers/media-conversion/sticker.provider.js';

export default defineSdkPlugin({
    help: ['attp', 'brat', 'bratvid'],
    tags: ['sticker'],
    command: /^(attp|ttp|ttp2|ttp3|ttp4|attp2|brat|brat2|bratvid)$/i,
    register: true,
    async execute(m, {sdk}) {
    const {packname: f, author: g} = await getStickerExif(sdk.sender);
    if (!sdk.text) return sdk.reply.message('stickers.text.usage', {command: sdk.usedPrefix + sdk.command})
    sdk.conn.fakeReply(sdk.chatId, sdk.content.message('stickers.text.processing'), '0@s.whatsapp.net', sdk.content.message('stickers.text.quoted'), 'status@broadcast')

    const sendSticker = async (url: string) => {
        let stiker = await sticker(null, url, f, g)
        await sdk.sendFile(stiker, 'sticker.webp', '', m, true, {
            contextInfo: {
                'forwardingScore': 200,
                'isForwarded': false,
                externalAdReply: {
                    showAdAttribution: false,
                    title: sdk.branding.watermark,
                    body: botInfo.vs,
                    mediaType: 2,
                    sourceUrl: botInfo.md,
                    thumbnail: m.pp
                }
            }
        })
    }

    if (sdk.command == 'attp') {
        if (sdk.text.length > 40) return sdk.reply.message('stickers.text.tooLong40')
        const url = await getTextStickerUrl('attp', sdk.text)
        if (!url) return sdk.reply.message('stickers.text.apiDown')
        await sendSticker(url)
    }

    if (sdk.command == 'ttp' || sdk.command == 'brat') {
        if (sdk.text.length > 300) return sdk.reply.message('stickers.text.tooLong300')
        const url = await getTextStickerUrl('brat', sdk.text)
        if (!url) return sdk.reply.message('stickers.text.apiDown')
        await sendSticker(url)
    }

    if (sdk.command == 'brat2' || sdk.command == 'bratvid') {
        if (sdk.text.length > 250) return sdk.reply.message('stickers.text.tooLong250')
        const url = await getTextStickerUrl('bratvid' satisfies TextStickerKind, sdk.text)
        if (!url) return sdk.reply.message('stickers.text.apiDown')
        await sendSticker(url)
    }
    }
})
