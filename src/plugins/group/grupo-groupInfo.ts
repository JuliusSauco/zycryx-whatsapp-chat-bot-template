import {definePlugin} from '../../core/define-plugin.js'
import {getNumberByLid} from '../../services/user.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

export default definePlugin({
    help: ['infogp'],
    tags: ['group'],
    command: ['infogrupo', 'groupinfo', 'infogp'],
    group: true,
    register: true,
    needsFullGroupSettings: true,
    async execute(m, {conn, metadata: groupMetadata, participants, groupSettings}) {
    const pp = await conn.profilePictureUrl(m.chat, 'image').catch(() => getRequiredPluginMessage('group.groupInfo.fallbackPicture'))

    const groupAdmins = participants.filter(p => p.admin)
    const usarLid = participants.some(p => p.id?.endsWith?.('@lid'))
    const listAdmin = await Promise.all(groupAdmins.map(async v => {
        let numero = null
        if (usarLid && v.id.endsWith('@lid')) {
            numero = await getNumberByLid(v.id)
        } else if (/^\d+@s\.whatsapp\.net$/.test(v.id)) {
            numero = v.id.split('@')[0]
        }
        return renderTemplate(getRequiredPluginMessage('group.groupInfo.adminItem'), {
            user: numero || getRequiredPluginMessage('group.groupInfo.unknownUser'),
        })
    }))

    const data = groupSettings || {}
    const {welcome, detect, antifake, antilink, virusTotal, modoadmin, primary_bot, modohorny, nsfw_horario, banned, messageLogging} = data
    const fallbackOwner = m.chat.includes('-') ? m.chat.split('-')[0] + '@s.whatsapp.net' : null
    const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || fallbackOwner || getRequiredPluginMessage('group.groupInfo.unknownOwner')

    let primaryBotMention = ''
    if (primary_bot) {
        primaryBotMention = `@${primary_bot.split('@')[0]}`
    }

    const enabled = getRequiredPluginMessage('group.groupInfo.enabled')
    const disabled = getRequiredPluginMessage('group.groupInfo.disabled')
    const text = renderTemplate(getRequiredPluginMessage('group.groupInfo.response'), {
        groupId: groupMetadata.id,
        groupName: groupMetadata.subject,
        memberCount: participants.length,
        owner: owner.split('@')[0],
        admins: listAdmin.join('\n'),
        botStatus: modoadmin ? getRequiredPluginMessage('group.groupInfo.botOff') : `${primaryBotMention || getRequiredPluginMessage('group.groupInfo.botOnline')}`,
        welcome: welcome ? enabled : disabled,
        antilink: antilink ? enabled : disabled,
        virusTotal: virusTotal ? enabled : disabled,
        antifake: antifake ? enabled : disabled,
        detect: detect ? enabled : disabled,
        modohorny: modohorny ? enabled : disabled,
        nsfwSchedule: nsfw_horario
            ? renderTemplate(getRequiredPluginMessage('group.groupInfo.nsfwSchedule'), {schedule: nsfw_horario})
            : disabled,
        messageLogging: messageLogging ? enabled : disabled,
        banned: banned ? getRequiredPluginMessage('group.groupInfo.bannedYes') : getRequiredPluginMessage('group.groupInfo.bannedNo'),
    }).trim()
    await conn.sendFile(m.chat, pp, 'pp.jpg', text, m)
    }
})

