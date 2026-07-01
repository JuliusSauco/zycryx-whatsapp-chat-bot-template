import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {listGroupMessageCounts} from '../../services/chat.service.js';
import {getNumberByLid} from '../../services/user.service.js';

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

export default defineSdkPlugin({
    help: ['tagall <mensaje>', 'invocar <mensaje>', 'contador'],
    tags: ['group'],
    command: /^(tagall|invocar|invocacion|todos|invocación|contador)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {sdk}) {

    if (/^(tagall|invocar|invocacion|todos|invocación)$/i.test(sdk.command)) {
        try {
            if (!sdk.participants.length) return
            const users = sdk.participants.map(p => p.phoneNumber || p.id)
            const total = users.length

            await sdk.reply.react("📣")
            let mensaje = ""
            mensaje += sdk.content.message('group.tagAll.header')
            if (sdk.text && sdk.text.trim()) {
                mensaje += sdk.content.renderMessage('group.tagAll.messageLine', {message: sdk.text.trim()})
            }
            mensaje += sdk.content.renderMessage('group.tagAll.totalLine', {total})
            mensaje += sdk.content.message('group.tagAll.tagsTitle')
            mensaje += users.map(u => sdk.content.renderMessage('group.tagAll.item', {
                user: u.replace(/@s\.whatsapp\.net|@lid/g, "").replace(/[^0-9]/g, ""),
            })).join(" \n ")

            await sdk.sendMessage({text: mensaje, mentions: users})
        } catch (e: unknown) {
            logError("❌ Error en /tagall:", e)
        }
    }

    if (sdk.command == 'contador') {
        const counts = await listGroupMessageCounts(sdk.chatId)

        let memberData: MemberActivity[] = (sdk.participants as ParticipantWithAlt[]).map(mem => {
            const userId = mem.id
            const userData = counts.find(row => row.user_id === userId) || {message_count: 0}
            return {id: userId, alt: mem.participantAlt, messages: userData.message_count}
        })

        memberData.sort((a, b) => b.messages - a.messages)
        let activeCount = memberData.filter(mem => mem.messages > 0).length
        let inactiveCount = memberData.filter(mem => mem.messages === 0).length
        let teks = sdk.content.message('group.tagAll.activityHeader')
        teks += sdk.content.renderMessage('group.tagAll.activitySummary', {
            group: sdk.metadata.subject || sdk.content.message('group.tagAll.unknownGroup'),
            total: sdk.participants.length,
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
                teks += sdk.content.renderMessage('group.tagAll.activityItem', {
                    user: numero,
                    messages: mem.messages,
                })
            }
        }

        await sdk.sendMessage({
            text: teks,
            mentions: memberData.map(mem => mem.alt?.endsWith('@s.whatsapp.net') ? mem.alt : mem.id).filter(jid => jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'))
        })
    }
    }
})
//handler.botAdmin = true

