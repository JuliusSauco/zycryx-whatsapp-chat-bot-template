import {botInfo} from "../../core/config.js";
import {logError, logInfo} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {pickRandom} from '../../utils/random.js'
import {searchStickerlyPacks} from '../../providers/media-conversion/sticker.provider.js'

export default defineSdkPlugin({
    command: ['stickerly'],
    help: ['stickerly <texto>'],
    tags: ['sticker'],
    register: true,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('stickers.pack.usage', {command: sdk.usedPrefix + sdk.command})

    try {
        const packs = await searchStickerlyPacks(sdk.text, 30)
        if (!packs.length) return sdk.reply.message('stickers.pack.notFound', {query: sdk.text})

        const {packname, author} = await getStickerExif(sdk.sender)
        const total = packs.length
        const max = Math.min(total, 30)

        await sdk.reply.message('stickers.pack.sending', {
            query: sdk.text,
            count: String(max),
        })

        let enviados = 0
        for (const pack of packs) {
            try {
                const stkr = await sticker(false, pack.thumbnailUrl, packname, author)
                if (stkr) {
                    await sdk.sendFile(stkr, 'sticker.webp', '', m, true, {
                        contextInfo: {
                            'forwardingScore': 200,
                            'isForwarded': false,
                            externalAdReply: {
                                showAdAttribution: false,
                                title: sdk.branding.watermark,
                                body: pack.name,
                                mediaType: 2,
                                sourceUrl: pickRandom([botInfo.nna, botInfo.nna2, botInfo.md, botInfo.yt]),
                                thumbnail: m.pp
                            }
                        }
                    })
                    enviados++
                    await new Promise(r => setTimeout(r, 700))
                }
            } catch (err: unknown) {
                logInfo('❌ Error en sticker:', err)
            }
        }

        if (enviados === 0) return sdk.reply.message('stickers.pack.noneSent')
        else return sdk.reply.react("✅")
    } catch (e: unknown) {
        logError(e)
        await sdk.reply.message('stickers.pack.searchError')
    }
    }
})
