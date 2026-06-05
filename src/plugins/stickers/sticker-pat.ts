import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import fetch from 'node-fetch'
import {definePlugin} from '../../core/define-plugin.js'

interface WaifuPicsResponse {
    url?: string;
}

export default definePlugin({
    help: ['pat'],
    tags: ['sticker'],
    command: /^(pat|palmaditas|cariños|mimos|patt)$/i,
    register: true,
    async execute(m, {conn}) {
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        const getName = async (jid: string) => (await conn.getName(jid).catch(() => null)) || `+${jid.split('@')[0]}`
        const senderName = await getName(m.sender)
        const mentionedNames = await Promise.all(m.mentionedJid.map(getName))
        const {url} = await fetch('https://api.waifu.pics/sfw/pat').then(r => r.json() as Promise<WaifuPicsResponse>)
        if (!url) return m.reply('❌ La API no devolvió sticker.')
        const texto = `🫂 ${senderName} le dio palmaditas a ${mentionedNames.join(', ')}`

        let stiker
        try {
            stiker = await sticker(null, url, texto, info.author)
        } catch (e: unknown) {
            logError('⚠️ Error generando sticker:', e)
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

        const gifBuffer = await fetch(url).then(r => r.buffer())
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
