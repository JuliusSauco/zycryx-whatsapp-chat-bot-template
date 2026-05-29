import {sticker} from '../lib/sticker.js'
import fetch from 'node-fetch'
import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['hug'],
    tags: ['sticker'],
    command: /^(hug|abrazo|abrazar|abrazito)$/i,
    register: true,
    async execute(m, {conn}) {
    const legacyConn = conn as any
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        const getName = async (jid: any) => (await conn.getName(jid).catch(() => null)) || `+${jid.split('@')[0]}`
        const senderName = await getName(m.sender)
        const mentionedNames = await Promise.all(m.mentionedJid.map(getName))
        const texto = `🤗 ${senderName} abrazó con cariño a ${mentionedNames.join(', ')}`
        const {url: gifUrl} = await fetch('https://api.waifu.pics/sfw/hug').then((r: any) => r.json() as any)

        let stiker
        try {
            // @ts-ignore
            stiker = await sticker(null, gifUrl, texto)
        } catch (e: any) {
            console.error('❌ Error generando sticker:', e)
        }

        if (stiker) {
            await legacyConn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
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
            }, {quoted: m})
            return
        }

        const gifBuffer = await fetch(gifUrl).then(r => r.buffer())
        await conn.sendMessage(m.chat, {
            video: gifBuffer,
            gifPlayback: true,
            caption: texto,
            mentions: m.mentionedJid
        }, {quoted: m})
    } catch (e: any) {
        console.error(e)
        m.react("❌️")
    }
    }
})
