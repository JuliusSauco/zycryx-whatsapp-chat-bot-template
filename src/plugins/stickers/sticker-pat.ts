import {botInfo} from "../../core/config.js";
import {logError} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {getRemoteMediaBuffer, getWaifuActionUrl} from '../../providers/media-conversion/sticker.provider.js';

export default defineSdkPlugin({
    help: ['patt'],
    tags: ['sticker'],
    command: /^(pat|palmaditas|cariños|mimos|patt)$/i,
    register: true,
    async execute(m, {sdk}) {
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(sdk.sender)

        const getName = async (jid: string) => (await sdk.conn.getName(jid).catch(() => null)) || `+${jid.split('@')[0]}`
        const senderName = await getName(sdk.sender)
        const mentionedNames = await Promise.all(m.mentionedJid.map(getName))
        const url = await getWaifuActionUrl('pat')
        if (!url) return sdk.reply.message('stickers.common.apiNoSticker')
        const texto = `🫂 ${senderName} le dio palmaditas a ${mentionedNames.join(', ')}`

        let stiker
        try {
            stiker = await sticker(null, url, texto, botInfo.author)
        } catch (e: unknown) {
            logError('⚠️ Error generando sticker:', e)
        }

        if (stiker) {
            await sdk.sendFile(stiker, 'sticker.webp', '', m, true, {
                contextInfo: {
                    forwardingScore: 200,
                    isForwarded: false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title: texto,
                        body: sdk.branding.watermark,
                        mediaType: 2,
                        sourceUrl: botInfo.md,
                        thumbnail: m.pp
                    }
                }
            })
            return
        }

        const gifBuffer = await getRemoteMediaBuffer(url)
        await sdk.sendMessage({
            video: gifBuffer,
            gifPlayback: true,
            caption: texto,
            mentions: m.mentionedJid
        })
    } catch (e: unknown) {
        logError(e)
        await sdk.reply.react("❌️")
    }
    }
})
