import {logError, logInfo} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson} from '../../lib/http-client.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {pickRandom} from '../../utils/random.js'

interface StickerlyPack {
    name: string;
    author: string;
    stickerCount: number;
    viewCount: number;
    exportCount: number;
    url: string;
    thumbnailUrl: string;
}

interface StickerlyResponse {
    success?: boolean;
    data?: StickerlyPack[];
}

export default definePlugin({
    command: ['stickerly'],
    help: ['stickerly <texto>'],
    tags: ['sticker'],
    register: true,
    async execute(m, {text, conn, usedPrefix, command}) {
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('stickers.pack.usage'), {command: usedPrefix + command}))

    try {
        const json = await httpJson<StickerlyResponse>(`https://api.dorratz.com/v3/stickerly?query=${encodeURIComponent(text)}`)

        if (!json.success || !json.data?.length) return m.reply(renderTemplate(getRequiredPluginMessage('stickers.pack.notFound'), {query: text}))

        const packs = json.data.slice(0, 30)

        const {packname, author} = await getStickerExif(m.sender)
        const total = packs.length
        const max = Math.min(total, 30)

        m.reply(renderTemplate(getRequiredPluginMessage('stickers.pack.sending'), {
            query: text,
            count: String(max),
        }))

        let enviados = 0
        for (const pack of packs) {
            try {
                const stkr = await sticker(false, pack.thumbnailUrl, packname, author)
                if (stkr) {
                    await conn.sendFile(m.chat, stkr, 'sticker.webp', '', m, true, {
                        contextInfo: {
                            'forwardingScore': 200,
                            'isForwarded': false,
                            externalAdReply: {
                                showAdAttribution: false,
                                title: info.wm,
                                body: pack.name,
                                mediaType: 2,
                                sourceUrl: pickRandom([info.nna, info.nna2, info.md, info.yt]),
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

        if (enviados === 0) return m.reply(getRequiredPluginMessage('stickers.pack.noneSent'))
        else return m.react("✅")
        // m.reply(`✅ *${enviados} stickers enviados.*`)

    } catch (e: unknown) {
        logError(e)
        m.reply(getRequiredPluginMessage('stickers.pack.searchError'))
    }
    }
})
