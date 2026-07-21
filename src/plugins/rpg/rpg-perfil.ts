import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import moment from 'moment-timezone'
import {getUserName} from '../../services/user.service.js'
import {getGroupParticipantRole} from '../../services/group-role.service.js'
import {getParticipantsFast} from '../../utils/mention.js'
import {content} from '../../services/content.service.js';
import {resolveProfileUser} from '../../services/profile-user.service.js';
import {loadProfileMedia} from './rpg-profile.helpers.js';
import {logWarn} from '../../lib/logger.js';

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
        fetchBuffer: sdk.http.buffer,
        onFallback: reason => logWarn(`[RPG PROFILE] Foto no disponible (${reason}); se usara el avatar local.`),
    })
    const {limite, nombre, registered, edad, marry, gender, birthday} = user
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
    if (marry) {
        const nombrePareja = await getUserName(marry) || sdk.content.message('rpg.shared.unknown')
        relacion = sdk.content.renderMessage('rpg.profile.relationship', {spouseName: nombrePareja})
    }
    const targetParticipant = isGroup ? participant : null
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
    await conn.sendFile(m.chat, profileMedia, 'perfil.jpg', texto, m, false, {
        contextInfo: {mentionedJid: [mentionJid]},
    })
    }
})

