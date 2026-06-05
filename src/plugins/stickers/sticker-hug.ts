import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {definePlugin} from '../../core/define-plugin.js'
import {httpBuffer, httpJson} from '../../lib/http-client.js'

interface WaifuPicsResponse {
    url?: string;
}

export default definePlugin({
    help: ['hug'],
    tags: ['sticker'],
    command: /^(hug|abrazo|abrazar|abrazito)$/i,
    register: true,
    async execute(m, {conn}) {
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        const getName = async (jid: string) => (await conn.getName(jid).catch(() => null)) || `+${jid.split('@')[0]}`
        const senderName = await getName(m.sender)
        const mentionedNames = await Promise.all(m.mentionedJid.map(getName))
        const texto = `🤗 ${senderName} abrazó con cariño a ${mentionedNames.join(', ')}`
        const {url: gifUrl} = await httpJson<WaifuPicsResponse>('https://api.waifu.pics/sfw/hug')
        if (!gifUrl) return m.reply('❌ La API no devolvió sticker.')

        let stiker
        try {
            stiker = await sticker(null, gifUrl, texto, info.author)
        } catch (e: unknown) {
            logError('❌ Error generando sticker:', e)
        }

        if (stiker) {
            await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
                contextInfo: {
                    forwardingScore: 200,
                    isForwarded: false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title: texto,
                        body: info.wm,
                        mediaType: 2,
                        sourceUrl: info.md,
                        thumbnail: m.pp
                    }
                }
            })
            return
        }

        const gifBuffer = await httpBuffer(gifUrl)
        await conn.sendMessage(m.chat, {
            video: gifBuffer,
            gifPlayback: true,
            caption: texto,
            mentions: m.mentionedJid
        }, {quoted: m})
    } catch (e: unknown) {
        logError(e)
        m.react("❌️")
    }
    }
})
