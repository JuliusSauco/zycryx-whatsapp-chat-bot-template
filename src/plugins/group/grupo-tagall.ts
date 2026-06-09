import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {listGroupMessageCounts} from '../../services/chat.service.js';
import {getNumberByLid} from '../../services/user.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

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
    async execute(m, {conn, text, participants, metadata, command}) {

    if (/^(tagall|invocar|invocacion|todos|invocación)$/i.test(command)) {
        try {
            if (!participants.length) return
            const users = participants.map(p => p.phoneNumber || p.id)
            const total = users.length

            await m.react("📣")
            let mensaje = ""
            mensaje += getRequiredPluginMessage('group.tagAll.header')
            if (text && text.trim()) {
                mensaje += renderTemplate(getRequiredPluginMessage('group.tagAll.messageLine'), {message: text.trim()})
            }
            mensaje += renderTemplate(getRequiredPluginMessage('group.tagAll.totalLine'), {total})
            mensaje += getRequiredPluginMessage('group.tagAll.tagsTitle')
            mensaje += users.map(u => renderTemplate(getRequiredPluginMessage('group.tagAll.item'), {
                user: u.replace(/@s\.whatsapp\.net|@lid/g, "").replace(/[^0-9]/g, ""),
            })).join(" \n ")

            await conn.sendMessage(m.chat, {text: mensaje, mentions: users}, {quoted: m})
        } catch (e: unknown) {
            logError("❌ Error en /tagall:", e)
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
        let teks = getRequiredPluginMessage('group.tagAll.activityHeader')
        teks += renderTemplate(getRequiredPluginMessage('group.tagAll.activitySummary'), {
            group: metadata.subject || getRequiredPluginMessage('group.tagAll.unknownGroup'),
            total: participants.length,
            active: activeCount,
            inactive: inactiveCount,
        })

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
                teks += renderTemplate(getRequiredPluginMessage('group.tagAll.activityItem'), {
                    user: numero,
                    messages: mem.messages,
                })
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

