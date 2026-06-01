import {sticker} from '../../lib/sticker.js'
import fetch from 'node-fetch'
import {definePlugin} from '../../core/define-plugin.js'

interface NekosKissResponse {
    url?: string;
}

export default definePlugin({
    help: ['kiss'],
    tags: ['sticker'],
    command: /^(msggifkiss|msggif-kiss|gifkiss|kissgif)$/i,
    register: true,
    async execute(m, {conn}) {
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        let getName = async (jid: string) => {
            let name = await conn.getName(jid).catch(() => null)
            return name || `+${jid.split('@')[0]}`
        }

        let senderName = await getName(m.sender)
        let mentionedNames = await Promise.all(m.mentionedJid.map(getName))
        let res = await fetch('https://nekos.life/api/kiss')
        let json = await res.json() as NekosKissResponse
        let {url} = json
        if (!url) return m.reply('❌ La API no devolvió sticker.')
        let texto = `💋 ${senderName} está besando a ${mentionedNames.join(', ')}`
        try {
            let stickerMessage = await sticker(null, url, texto, info.author)
            await conn.sendFile(m.chat, stickerMessage, 'sticker.webp', '', m, true, {
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
        } catch (err: unknown) {
            await conn.sendMessage(m.chat, {
                video: {url: url},
                gifPlayback: true,
                caption: texto,
                mentions: m.mentionedJid
            }, {quoted: m})
        }
    } catch (e: unknown) {
        console.error(e)
    }
    }
})
