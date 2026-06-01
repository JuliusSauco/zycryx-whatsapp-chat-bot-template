import {definePlugin} from '../../core/define-plugin.js'
import type {MessageContent} from '../../types/context.js'

export default definePlugin({
    help: ['hidetag'],
    tags: ['group'],
    command: /^(hidetag|notificar|notify)$/i,
    admin: true,
    group: true,
    register: true,
    async execute(m, {conn, text, participants, isOwner, usedPrefix, command, isAdmin}) {
    if (!m.quoted && !text) return m.reply(`𝙔 𝙀𝙇 𝙏𝙀𝙓𝙏𝙊?`)
    let users = participants.map(u => conn.decodeJid(u.id))
    if (m.quoted && m.quoted.message) {
        const type = Object.keys(m.quoted.message)[0]
        const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(type)
        if (isMedia) {
            try {
                let mediax = await m.quoted.download()
                let msg: MessageContent = {contextInfo: {mentionedJid: users}}
                if (type === 'imageMessage') {
                    msg.image = mediax
                    if (text) msg.caption = text
                } else if (type === 'videoMessage') {
                    msg.video = mediax
                    if (text) msg.caption = text
                } else if (type === 'audioMessage') {
                    msg.audio = mediax
                    msg.ptt = true
                    msg.fileName = 'Hidetag.mp3'
                    msg.mimetype = 'audio/mp4'
                } else if (type === 'stickerMessage') {
                    msg.sticker = mediax
                } else if (type === 'documentMessage') {
                    msg.document = mediax
                    msg.fileName = 'archivo'
                    msg.mimetype = m.quoted.mimetype || 'application/octet-stream'
                }
                await conn.sendMessage(m.chat, msg, {quoted: undefined})
                return
            } catch (e: unknown) {
            }
        }
    }

    let texto = ''
    if (m.quoted?.message) {
        const msg = m.quoted.message
        texto = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || ''
    }

    if (!texto && typeof m.originalText === 'string' && m.originalText.length > 0) {
        let prefix = usedPrefix || ''
        let cmd = command || ''
        let original = m.originalText.trimStart()
        if (original.slice(0, prefix.length + cmd.length).toLowerCase() === (prefix + cmd).toLowerCase()) {
            texto = original.slice(prefix.length + cmd.length).trimStart()
        } else {
            texto = original
        }
    }

    try {
        await conn.sendMessage(m.chat, {text: texto, contextInfo: {mentionedJid: users}}, {quoted: undefined})
    } catch (e: unknown) {
        console.error(e)
    }
    }
})
