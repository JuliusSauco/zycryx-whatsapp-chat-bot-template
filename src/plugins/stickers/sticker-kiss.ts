import {logError} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {getKissGifUrl} from '../../providers/media-conversion/sticker.provider.js';

export default defineSdkPlugin({
    help: ['gifkiss'],
    tags: ['sticker'],
    command: /^(msggifkiss|msggif-kiss|gifkiss|kissgif)$/i,
    register: true,
    async execute(m, {sdk}) {
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(sdk.sender)

        let getName = async (jid: string) => {
            let name = await sdk.conn.getName(jid).catch(() => null)
            return name || `+${jid.split('@')[0]}`
        }

        let senderName = await getName(sdk.sender)
        let mentionedNames = await Promise.all(m.mentionedJid.map(getName))
        let url = await getKissGifUrl()
        if (!url) return sdk.reply.message('stickers.common.apiNoSticker')
        let texto = `💋 ${senderName} está besando a ${mentionedNames.join(', ')}`
        try {
            let stickerMessage = await sticker(null, url, texto, info.author)
            await sdk.sendFile(stickerMessage, 'sticker.webp', '', m, true, {
                contextInfo: {
                    forwardingScore: 200,
                    isForwarded: false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title: texto,
                        body: sdk.branding.watermark,
                        mediaType: 2,
                        sourceUrl: info.md,
                        thumbnail: m.pp
                    }
                }
            })
        } catch (err: unknown) {
            await sdk.sendMessage({
                video: {url: url},
                gifPlayback: true,
                caption: texto,
                mentions: m.mentionedJid
            })
        }
    } catch (e: unknown) {
        logError(e)
    }
    }
})
