import {definePlugin} from '../../core/define-plugin.js'
import {getNumberByLid} from '../../services/user.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {cleanJid} from '../../utils/jid.js'
import {getGroupParticipantRole} from '../../services/group-role.service.js'
import type {GroupParticipant} from '@whiskeysockets/baileys'

type GroupInfoParticipant = GroupParticipant & {
    participantAlt?: string
    phoneNumber?: string | number
}

type MentionTarget = {
    user: string
    mentionJid: string | null
}

const PHONE_JID_REGEX = /^\d+@s\.whatsapp\.net$/

async function resolveGroupMention(rawJid: string | null | undefined, participants: GroupInfoParticipant[], fallbackUser = getRequiredPluginMessage('group.groupInfo.unknownUser')): Promise<MentionTarget> {
    const jid = cleanJid(rawJid || '')

    if (PHONE_JID_REGEX.test(jid)) {
        return {user: jid.split('@')[0], mentionJid: jid}
    }

    const participant = participants.find(p => {
        const id = cleanJid(p.id || '')
        const alt = cleanJid(p.participantAlt || '')
        return id === jid || alt === jid
    })

    const participantAlt = cleanJid(participant?.participantAlt || '')
    if (PHONE_JID_REGEX.test(participantAlt)) {
        return {user: participantAlt.split('@')[0], mentionJid: participantAlt}
    }

    const participantPhone = (participant?.phoneNumber || '').toString().replace(/[^\d]/g, '')
    if (participantPhone) {
        return {user: participantPhone, mentionJid: `${participantPhone}@s.whatsapp.net`}
    }

    if (jid.endsWith('@lid')) {
        const numberByLid = (await getNumberByLid(jid))?.replace(/[^\d]/g, '') || ''
        if (numberByLid) return {user: numberByLid, mentionJid: `${numberByLid}@s.whatsapp.net`}
        return {user: fallbackUser, mentionJid: jid}
    }

    return {user: fallbackUser, mentionJid: jid || null}
}

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
    const groupInfoParticipants = participants as GroupInfoParticipant[]
    const adminMentions = await Promise.all(groupAdmins.map(admin => resolveGroupMention(admin.id, groupInfoParticipants)))
    const adminRoles = await Promise.all(groupAdmins.map(admin => getGroupParticipantRole(m.chat, admin)))
    const listAdmin = adminMentions.map((admin, index) => renderTemplate(getRequiredPluginMessage('group.groupInfo.adminItem'), {
        user: admin.user,
        roleLine: adminRoles[index]?.role ? renderTemplate(getRequiredPluginMessage('group.roles.roleLine'), {role: adminRoles[index].role}) : '',
    }))

    const data = groupSettings || {}
    const {welcome, detect, antifake, antilink, virusTotal, modoadmin, primary_bot, modohorny, nsfw_horario, banned, messageLogging} = data
    const fallbackOwner = m.chat.includes('-') ? m.chat.split('-')[0] + '@s.whatsapp.net' : null
    const ownerJid = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || fallbackOwner
    const owner = await resolveGroupMention(ownerJid, groupInfoParticipants, getRequiredPluginMessage('group.groupInfo.unknownOwner'))

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
        owner: owner.user || getRequiredPluginMessage('group.groupInfo.unknownOwner'),
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

    const mentionedJid = [...new Set([owner.mentionJid, ...adminMentions.map(admin => admin.mentionJid)]
        .filter((jid): jid is string => Boolean(jid && jid.includes('@'))))]

    await conn.sendFile(m.chat, pp, 'pp.jpg', text, m, false, {contextInfo: {mentionedJid}})
    }
})

