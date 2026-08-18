import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import moment from 'moment-timezone'
import {getGroupParticipantRole} from '../../services/group-role.service.js'
import {getParticipantsFast} from '../../utils/mention.js'
import {content} from '../../services/content.service.js';
import {resolveProfileUser, resolveStoredUserMention} from '../../services/profile-user.service.js';
import {loadProfileMedia} from './rpg-profile.helpers.js';
import {logWarn} from '../../lib/logger.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';

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

const formatNumber = (value: number): string => new Intl.NumberFormat('es-CO').format(value);

function getGroupHierarchy(participant: GroupParticipant | null): string {
    if (!participant) return 'No disponible ❔';
    if (participant.admin === 'superadmin' || participant.isSuperAdmin) return 'Fundador/a 👑';
    if (participant.admin === 'admin' || participant.isAdmin) return 'Administrador/a 🛡️';
    return 'Miembro/a 👤';
}

export default defineSdkPlugin({
    help: ['perfil', 'perfil *@user*'],
    tags: ['rg'],
    command: /^(perfil|profile)$/i,
    async execute(m, {conn, participants, isGroup, chatId, sdk}) {
    const rawWho = m.mentionedJid?.[0] || m.quoted?.sender || (m.fromMe ? conn.user?.id || m.sender : m.sender)
    const groupParticipants = getParticipantsFast(conn, m.chat, participants)

    const profileTarget = await resolveProfileUser({
        rawJid: rawWho,
        participants: groupParticipants,
        aliases: rawWho === m.sender ? [m.lid] : [],
        displayName: rawWho === m.sender ? m.pushName : null,
        createIfMissing: true,
    })
    if (!profileTarget) return sdk.reply.message('rpg.shared.missingUser')

    const {userId: who, mentionJid, tag: userTag, participant, user} = profileTarget
    const profileMedia = await loadProfileMedia({
        conn,
        mentionJid,
        groupJid: isGroup ? chatId || m.chat : null,
        fetchBuffer: sdk.http.buffer,
        onFallback: reason => logWarn(`[RPG PROFILE] Imagen no disponible (${reason}); se intentara el siguiente fallback.`),
    })
    const {limite, nombre, registered, edad, marry, gender, birthday, exp, role: levelRole, dailystreak, regTime} = user
    const level = user.level ?? 0
    const phone = formatPhoneNumber(mentionJid)

    let nacionalidad = sdk.content.message('rpg.shared.unknownFemale')
    try {
        const data = await sdk.http.json<CountryResponse>(`${info.apis}/tools/country?text=${phone}`)
        if (data?.result?.name) nacionalidad = `${data.result.name} ${data.result.emoji}`
    } catch (_) {
        logWarn('[RPG PROFILE] No se pudo resolver la nacionalidad; se usara el valor por defecto.')
    }

    let relacion = sdk.content.message('rpg.profile.noRelationship')
    let spouseMentionJid: string | null = null
    if (marry) {
        const spouse = await resolveStoredUserMention(marry, groupParticipants)
        spouseMentionJid = spouse.mentionJid
        relacion = sdk.content.renderMessage('rpg.profile.relationship', {spouseTag: spouse.tag})
    }
    const targetParticipant = isGroup ? participant : null
    const isGroupAdmin = Boolean(targetParticipant && (
        targetParticipant.admin === 'admin'
        || targetParticipant.admin === 'superadmin'
        || targetParticipant.isAdmin
        || targetParticipant.isSuperAdmin
    ))
    const groupRole = targetParticipant && isGroupAdmin ? await getGroupParticipantRole(chatId || m.chat, targetParticipant) : null
    const assignedRoleBlock = groupRole?.role
        ? sdk.content.renderMessage('rpg.profile.assignedRoleBlock', {
            role: groupRole.role,
            descriptionLine: groupRole.role_description
                ? sdk.content.renderMessage('rpg.profile.roleDescriptionLine', {description: groupRole.role_description})
                : '',
        })
        : ''
    const groupBlock = isGroup
        ? sdk.content.renderMessage('rpg.profile.groupBlock', {
            group: sdk.metadata.subject || sdk.content.message('rpg.shared.unknown'),
            hierarchy: getGroupHierarchy(targetParticipant),
            assignedRoleBlock,
        })
        : ''

    const texto = sdk.content.renderMessage('rpg.profile.caption', {
        name: nombre || sdk.content.message('rpg.shared.unknown'),
        userTag,
        nationality: nacionalidad,
        ageLine: edad ? sdk.content.renderMessage('rpg.profile.ageLine', {age: edad}) : '',
        genderLine: gender ? sdk.content.renderMessage('rpg.profile.genderLine', {gender}) : '',
        birthdayLine: birthday ? sdk.content.renderMessage('rpg.profile.birthdayLine', {birthday: moment(birthday).format('DD/MM/YYYY')}) : '',
        registrationDateLine: regTime ? sdk.content.renderMessage('rpg.profile.registrationDateLine', {date: moment(regTime).format('DD/MM/YYYY')}) : '',
        limit: formatNumber(limite ?? 0),
        level: formatNumber(level),
        experience: formatNumber(exp ?? 0),
        levelRole,
        streak: formatNumber(dailystreak ?? 0),
        registered: registered ? sdk.content.message('rpg.profile.registeredYes') : sdk.content.message('rpg.profile.registeredNo'),
        relationship: relacion,
        groupBlock,
    })
    await conn.sendFile(m.chat, profileMedia, 'perfil.jpg', texto, m, false, {
        contextInfo: {mentionedJid: [...new Set([mentionJid, spouseMentionJid].filter((jid): jid is string => !!jid))]},
    })
    }
})

