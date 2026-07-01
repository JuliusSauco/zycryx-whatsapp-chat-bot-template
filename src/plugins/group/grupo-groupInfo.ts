import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js'
import {getNumberByLid} from '../../services/user.service.js'
import {cleanJid} from '../../utils/jid.js'
import {accessModeLabel} from '../../utils/access-mode.js'
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

async function resolveGroupMention(rawJid: string | null | undefined, participants: GroupInfoParticipant[], fallbackUser: string): Promise<MentionTarget> {
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

export default defineSdkPlugin({
    help: ['infogp'],
    tags: ['group'],
    command: ['infogrupo', 'groupinfo', 'infogp'],
    group: true,
    register: true,
    needsFullGroupSettings: true,
    async execute(m, {sdk}) {
    const pp = await sdk.conn.profilePictureUrl(sdk.chatId, 'image').catch(() => sdk.content.message('group.groupInfo.fallbackPicture'))

    const groupAdmins = sdk.participants.filter(p => p.admin)
    const groupInfoParticipants = sdk.participants as GroupInfoParticipant[]
    const adminMentions = await Promise.all(groupAdmins.map(admin => resolveGroupMention(admin.id, groupInfoParticipants, sdk.content.message('group.groupInfo.unknownUser'))))
    const adminRoles = await Promise.all(groupAdmins.map(admin => getGroupParticipantRole(sdk.chatId, admin)))
    const listAdmin = adminMentions.map((admin, index) => sdk.content.renderMessage('group.groupInfo.adminItem', {
        user: admin.user,
        roleLine: adminRoles[index]?.role ? sdk.content.renderMessage('group.roles.roleLine', {role: adminRoles[index].role}) : '',
    }))

    const data = sdk.groupSettings || {}
    const {welcome, detect, antifake, antilink, virusTotal, modoadmin, primary_bot, modohorny, nsfwAccessMode, nsfw_horario, banned, messageLogging} = data
    const fallbackOwner = sdk.chatId.includes('-') ? sdk.chatId.split('-')[0] + '@s.whatsapp.net' : null
    const ownerJid = sdk.metadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || fallbackOwner
    const owner = await resolveGroupMention(ownerJid, groupInfoParticipants, sdk.content.message('group.groupInfo.unknownOwner'))

    let primaryBotMention = ''
    if (primary_bot) {
        primaryBotMention = `@${primary_bot.split('@')[0]}`
    }

    const enabled = sdk.content.message('group.groupInfo.enabled')
    const disabled = sdk.content.message('group.groupInfo.disabled')
    const text = renderGroupInfo(sdk.content, {
        groupId: sdk.metadata.id,
        groupName: sdk.metadata.subject,
        memberCount: sdk.participants.length,
        owner: owner.user || sdk.content.message('group.groupInfo.unknownOwner'),
        admins: listAdmin.join('\n'),
        botStatus: modoadmin ? sdk.content.message('group.groupInfo.botOff') : `${primaryBotMention || sdk.content.message('group.groupInfo.botOnline')}`,
        welcome: welcome ? enabled : disabled,
        antilink: antilink ? enabled : disabled,
        virusTotal: virusTotal ? enabled : disabled,
        antifake: antifake ? enabled : disabled,
        detect: detect ? enabled : disabled,
        modohorny: modohorny ? `${enabled} (${accessModeLabel(nsfwAccessMode)})` : disabled,
        nsfwSchedule: nsfw_horario
            ? sdk.content.renderMessage('group.groupInfo.nsfwSchedule', {schedule: nsfw_horario})
            : disabled,
        messageLogging: messageLogging ? enabled : disabled,
        banned: banned ? sdk.content.message('group.groupInfo.bannedYes') : sdk.content.message('group.groupInfo.bannedNo'),
    }).trim()

    const mentionedJid = [...new Set([owner.mentionJid, ...adminMentions.map(admin => admin.mentionJid)]
        .filter((jid): jid is string => Boolean(jid && jid.includes('@'))))]

    await sdk.sendFile(pp, 'pp.jpg', text, m, false, {contextInfo: {mentionedJid}})
    }
})

function renderGroupInfo(content: PluginContentSdk, values: Record<string, string | number>): string {
    return content.renderMessage('group.groupInfo.response', values)
}

