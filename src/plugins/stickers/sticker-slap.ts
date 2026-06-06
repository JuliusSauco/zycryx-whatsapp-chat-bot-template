import {logError} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {definePlugin} from '../../core/define-plugin.js'
import {httpBuffer} from '../../lib/http-client.js'
import {pickRandom} from '../../utils/random.js'

const slapGifs = [
    'https://media.tenor.com/XiYuU9h44-AAAAAC/anime-slap-mad.gif',
    'https://img.photobucket.com/albums/v639/aoie_emesai/100handslap.gif',
    'https://gifdb.com/images/high/yuruyuri-akari-kyoko-anime-slap-fcacgc0edqhci6eh.gif',
    'https://gifdb.com/images/file/anime-sibling-slap-ptjipasdw3i3hsb0.gif',
    'https://c.tenor.com/Lc7C5mLIVIQAAAAC/tenor.gif',
    'https://i.pinimg.com/originals/71/a5/1c/71a51cd5b7a3e372522b5011bdf40102.gif'
]

export default definePlugin({
    help: ['slap'],
    tags: ['sticker'],
    command: /^(slap|bofetada|manotada|abofetear|golpear)$/i,
    register: true,
    async execute(m, {conn}) {
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        const getName = async (jid: string) => (await conn.getName(jid).catch(() => null)) || `+${jid.split('@')[0]}`
        const senderName = await getName(m.sender)
        const mentionedNames = await Promise.all(m.mentionedJid.map(getName))
        const texto = `🖐 ${senderName} le dio una bofetada a ${mentionedNames.join(', ')}`
        const url = pickRandom(slapGifs)

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

        const gifBuffer = await httpBuffer(url)
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
