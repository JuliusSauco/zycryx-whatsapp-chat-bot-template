import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import moment from 'moment-timezone'
import {getUserById, getUserName} from '../../services/user.service.js'
import {getGroupParticipantRole} from '../../services/group-role.service.js'
import {getParticipantIdentityJids} from '../../utils/group-creator.js'
import {cleanJid} from '../../utils/jid.js'
import {getParticipantsFast, resolveMention} from '../../utils/mention.js'
import type {GroupParticipant} from '@whiskeysockets/baileys'
import {content} from '../../services/content.service.js';

interface CountryResponse {
    result?: {
        name?: string
        emoji?: string
    }
}

const formatPhoneNumber = (jid: string) => {
    if (!jid) return content.message('rpg.shared.unknown');
    const number = jid.replace('@s.whatsapp.net', '');
    if (!/^\d{8,15}$/.test(number)) return content.message('rpg.shared.unknown');
    return `+${number}`;
};

const formatVisibleMention = (tag: string, mentionJid: string) => {
    const cleanMentionJid = cleanJid(mentionJid);
    if (cleanMentionJid.endsWith('@s.whatsapp.net')) return tag;
    return '@usuario';
};

function findParticipantByJid(participants: GroupParticipant[], jid: string): GroupParticipant | null {
    const target = cleanJid(jid);
    return participants.find(participant =>
        getParticipantIdentityJids(participant).some(candidate => cleanJid(candidate) === target)
    ) || null;
}

async function resolveProfileUser(rawJid: string, participants: GroupParticipant[]): Promise<{
    userId: string;
    mentionJid: string;
    tag: string;
    participant: GroupParticipant | null;
    user: NonNullable<Awaited<ReturnType<typeof getUserById>>>;
} | null> {
    const participant = findParticipantByJid(participants, rawJid);
    const resolved = resolveMention(rawJid, participants);
    const candidateIds = [...new Set([
        resolved.mentionJid,
        rawJid,
        ...(participant ? getParticipantIdentityJids(participant) : []),
    ].filter(Boolean).map(cleanJid))];

    for (const userId of candidateIds) {
        const user = await getUserById(userId);
        if (user) {
            return {
                userId,
                mentionJid: resolved.mentionJid,
                tag: formatVisibleMention(resolved.tag, resolved.mentionJid),
                participant,
                user,
            };
        }
    }
    return null;
}

export default defineSdkPlugin({
    help: ['perfil', 'perfil *@user*'],
    tags: ['rg'],
    command: /^(perfil|profile)$/i,
    register: true,
    async execute(m, {conn, participants, isGroup, chatId, sdk}) {
    const rawWho = m.mentionedJid?.[0] || m.quoted?.sender || (m.fromMe ? conn.user?.id || m.sender : m.sender)
    const groupParticipants = getParticipantsFast(conn, m.chat, participants)

    const profileTarget = await resolveProfileUser(rawWho, groupParticipants)
    if (!profileTarget) return sdk.reply.message('rpg.shared.missingUser')

    const {userId: who, mentionJid, tag: userTag, participant, user} = profileTarget
    const profilePic = await conn.profilePictureUrl(mentionJid, 'image').catch(() => 'https://telegra.ph/file/9d38415096b6c46bf03f8.jpg') as string
    const buffer = await sdk.http.buffer(profilePic)
    const {limite, nombre, registered, edad, marry, gender, birthday} = user
    const level = user.level ?? 0
    const phone = formatPhoneNumber(mentionJid)

    let nacionalidad = sdk.content.message('rpg.shared.unknownFemale')
    try {
        const data = await sdk.http.json<CountryResponse>(`${info.apis}/tools/country?text=${phone}`)
        if (data?.result?.name) nacionalidad = `${data.result.name} ${data.result.emoji}`
    } catch (_) {
    }

    let relacion = sdk.content.message('rpg.profile.noRelationship')
    if (marry) {
        const nombrePareja = await getUserName(marry) || sdk.content.message('rpg.shared.unknown')
        relacion = sdk.content.renderMessage('rpg.profile.relationship', {spouseName: nombrePareja})
    }
    const targetParticipant = isGroup ? participant || findParticipantByJid(groupParticipants, who) : null
    const groupRole = targetParticipant?.admin ? await getGroupParticipantRole(chatId || m.chat, targetParticipant) : null
    const roleBlock = groupRole?.role
        ? sdk.content.renderMessage('rpg.profile.roleBlock', {
            role: groupRole.role,
            descriptionLine: groupRole.role_description
                ? sdk.content.renderMessage('rpg.profile.roleDescriptionLine', {description: groupRole.role_description})
                : '',
        })
        : ''

    const texto = sdk.content.renderMessage('rpg.profile.caption', {
        name: nombre || sdk.content.message('rpg.shared.unknown'),
        userTag,
        nationality: nacionalidad,
        ageLine: edad ? sdk.content.renderMessage('rpg.profile.ageLine', {age: edad}) : '',
        genderLine: gender ? sdk.content.renderMessage('rpg.profile.genderLine', {gender}) : '',
        birthdayLine: birthday ? sdk.content.renderMessage('rpg.profile.birthdayLine', {birthday: moment(birthday).format('DD/MM/YYYY')}) : '',
        limit: limite ?? 0,
        level,
        registered: registered ? sdk.content.message('rpg.profile.registeredYes') : sdk.content.message('rpg.profile.registeredNo'),
        relationship: relacion,
        roleBlock,
    })
    await conn.sendFile(m.chat, buffer, 'perfil.jpg', texto, m, false, {
        contextInfo: {mentionedJid: [mentionJid]},
    })
    }
})

