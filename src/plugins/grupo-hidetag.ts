import {definePlugin} from '../core/define-plugin.js'
export default definePlugin({
    help: ['hidetag'],
    tags: ['group'],
    command: /^(hidetag|notificar|notify)$/i,
    admin: true,
    group: true,
    register: true,
    async execute(m, {conn, text, participants, isOwner, usedPrefix, command, isAdmin}) {
    const legacyConn = conn as any
    if (!m.quoted && !text) return m.reply(`𝙔 𝙀𝙇 𝙏𝙀𝙓𝙏𝙊?`)
    let users = participants.map((u: any) => conn.decodeJid(u.id))
    if (m.quoted && m.quoted.message) {
        const type = Object.keys(m.quoted.message)[0]
        const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(type)
        if (isMedia) {
            try {
                let mediax = await m.quoted.download()
                let msg = {contextInfo: {mentionedJid: users}}
                if (type === 'imageMessage') {
                    // @ts-ignore
                    msg.image = mediax
                    // @ts-ignore
                    if (text) msg.caption = text
                } else if (type === 'videoMessage') {
                    // @ts-ignore
                    msg.video = mediax
                    // @ts-ignore
                    if (text) msg.caption = text
                } else if (type === 'audioMessage') {
                    // @ts-ignore
                    msg.audio = mediax
                    // @ts-ignore
                    msg.ptt = true
                    // @ts-ignore
                    msg.fileName = 'Hidetag.mp3'
                    // @ts-ignore
                    msg.mimetype = 'audio/mp4'
                } else if (type === 'stickerMessage') {
                    // @ts-ignore
                    msg.sticker = mediax
                } else if (type === 'documentMessage') {
                    // @ts-ignore
                    msg.document = mediax
                    // @ts-ignore
                    msg.fileName = m.quoted.fileName || 'archivo'
                    // @ts-ignore
                    msg.mimetype = m.quoted.mimetype || 'application/octet-stream'
                }
                await legacyConn.sendMessage(m.chat, msg, {quoted: undefined})
                return
            } catch (e: any) {
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
    } catch (e: any) {
        console.error(e)
    }
    }
})
