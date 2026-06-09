import {definePlugin} from '../../core/define-plugin.js'
import moment from 'moment-timezone'
import {getUserById, getUserName} from '../../services/user.service.js'
import {httpBuffer, httpJson} from '../../lib/http-client.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

interface CountryResponse {
    result?: {
        name?: string
        emoji?: string
    }
}

const formatPhoneNumber = (jid: string) => {
    if (!jid) return getRequiredPluginMessage('rpg.shared.unknown');
    const number = jid.replace('@s.whatsapp.net', '');
    if (!/^\d{8,15}$/.test(number)) return getRequiredPluginMessage('rpg.shared.unknown');
    return `+${number}`;
};

export default definePlugin({
    help: ['perfil', 'perfil *@user*'],
    tags: ['rg'],
    command: /^(perfil|profile)$/i,
    register: true,
    async execute(m, {conn}) {
    let who = m.mentionedJid?.[0] || (m.fromMe ? conn.user?.id || m.sender : m.sender)

    const user = await getUserById(who)
    if (!user) return m.reply(getRequiredPluginMessage('rpg.shared.missingUser'))
    const profilePic = await conn.profilePictureUrl(who, 'image').catch(() => 'https://telegra.ph/file/9d38415096b6c46bf03f8.jpg') as string
    const buffer = await httpBuffer(profilePic)
    const {limite, nombre, registered, edad, marry, gender, birthday} = user
    const level = user.level ?? 0
    const phone = formatPhoneNumber(who)

    let nacionalidad = getRequiredPluginMessage('rpg.shared.unknownFemale')
    try {
        const data = await httpJson<CountryResponse>(`${info.apis}/tools/country?text=${phone}`)
        if (data?.result?.name) nacionalidad = `${data.result.name} ${data.result.emoji}`
    } catch (_) {
    }

    let relacion = getRequiredPluginMessage('rpg.profile.noRelationship')
    if (marry) {
        const nombrePareja = await getUserName(marry) || getRequiredPluginMessage('rpg.shared.unknown')
        relacion = renderTemplate(getRequiredPluginMessage('rpg.profile.relationship'), {spouseName: nombrePareja})
    }

    const texto = renderTemplate(getRequiredPluginMessage('rpg.profile.caption'), {
        name: nombre || getRequiredPluginMessage('rpg.shared.unknown'),
        phone,
        waNumber: who.split('@')[0],
        nationality: nacionalidad,
        ageLine: edad ? renderTemplate(getRequiredPluginMessage('rpg.profile.ageLine'), {age: edad}) : '',
        genderLine: gender ? renderTemplate(getRequiredPluginMessage('rpg.profile.genderLine'), {gender}) : '',
        birthdayLine: birthday ? renderTemplate(getRequiredPluginMessage('rpg.profile.birthdayLine'), {birthday: moment(birthday).format('DD/MM/YYYY')}) : '',
        limit: limite ?? 0,
        level,
        registered: registered ? getRequiredPluginMessage('rpg.profile.registeredYes') : getRequiredPluginMessage('rpg.profile.registeredNo'),
        relationship: relacion
    })
    await conn.sendFile(m.chat, buffer, 'perfil.jpg', texto, m)
    }
})

