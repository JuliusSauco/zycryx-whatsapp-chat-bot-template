import {definePlugin} from '../core/define-plugin.js'
import {listGroupMessageCounts} from '../services/chat.service.js';
import {getNumberByLid} from '../services/user.service.js';

type ParticipantWithAlt = {
    id: string
    phoneNumber?: string
    participantAlt?: string
}

type MemberActivity = {
    id: string
    alt?: string
    messages: number
}

export default definePlugin({
    help: ['tagall <mensaje>', 'invocar <mensaje>', 'contador'],
    tags: ['group'],
    command: /^(tagall|invocar|invocacion|todos|invocación|contador)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {conn, text, participants, metadata, args, command}) {

    if (/^(tagall|invocar|invocacion|todos|invocación)$/i.test(command)) {
        try {
            const metadata = await conn.groupMetadata(m.chat)
            const participants = metadata.participants || []
            if (!participants.length) return
            const users = participants.map(p => p.phoneNumber || p.id)
            const total = users.length

            await m.react("📣")
            let mensaje = ""
            mensaje += `*⺀ ＡＣＴＩＶＥ ＧＲＵＰＯ 🗣️⺀*\n\n`
            if (text && text.trim()) {
                mensaje += `❏ *Mensaje:* ${text.trim()}\n`
            }
            mensaje += `*👥 Miembros del grupo:* ${total}\n`
            mensaje += `❏ *Etiquetas:*\n`
            mensaje += users.map(u => `➥ @${u.replace(/@s\.whatsapp\.net|@lid/g, "").replace(/[^0-9]/g, "")}`).join(" \n ")

            await conn.sendMessage(m.chat, {text: mensaje, mentions: users}, {quoted: m})
        } catch (e: unknown) {
            console.error("❌ Error en /tagall:", e)
        }
    }

    if (command == 'contador') {
        const counts = await listGroupMessageCounts(m.chat)

        let memberData: MemberActivity[] = (participants as ParticipantWithAlt[]).map(mem => {
            const userId = mem.id
            const userData = counts.find(row => row.user_id === userId) || {message_count: 0}
            return {id: userId, alt: mem.participantAlt, messages: userData.message_count}
        })

        memberData.sort((a, b) => b.messages - a.messages)
        let activeCount = memberData.filter(mem => mem.messages > 0).length
        let inactiveCount = memberData.filter(mem => mem.messages === 0).length
        let teks = `*📊 Actividad del grupo 📊*\n\n`
        teks += `□ Grupo: ${metadata.subject || 'Sin nombre'}\n`
        teks += `□ Total de miembros: ${participants.length}\n`
        teks += `□ Miembros activos: ${activeCount}\n`
        teks += `□ Miembros inactivos: ${inactiveCount}\n\n`
        teks += `*□ Lista de miembros:*\n`

        for (let mem of memberData) {
            let numero = null
            if (mem.id.endsWith('@lid')) {
                if (mem.alt && mem.alt.endsWith('@s.whatsapp.net')) {
                    numero = mem.alt.split('@')[0]
                } else {
                    numero = await getNumberByLid(mem.id)
                }
            } else if (/^\d+@s\.whatsapp\.net$/.test(mem.id)) {
                numero = mem.id.split('@')[0]
            }
            if (numero) {
                teks += `➥ @${numero} - Mensajes: ${mem.messages}\n`
            }
        }

        await conn.sendMessage(m.chat, {
            text: teks,
            mentions: memberData.map(mem => mem.alt?.endsWith('@s.whatsapp.net') ? mem.alt : mem.id).filter(jid => jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'))
        }, {quoted: m})
    }
    }
})
//handler.botAdmin = true

