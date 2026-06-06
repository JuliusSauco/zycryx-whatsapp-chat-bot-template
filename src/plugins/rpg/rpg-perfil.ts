import {definePlugin} from '../../core/define-plugin.js'
import moment from 'moment-timezone'
import {getUserById, getUserName} from '../../services/user.service.js'
import {httpBuffer, httpJson} from '../../lib/http-client.js'

interface CountryResponse {
    result?: {
        name?: string
        emoji?: string
    }
}

const formatPhoneNumber = (jid: string) => {
    if (!jid) return 'Desconocido';
    const number = jid.replace('@s.whatsapp.net', '');
    if (!/^\d{8,15}$/.test(number)) return 'Desconocido';
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
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.')
    const profilePic = await conn.profilePictureUrl(who, 'image').catch(() => 'https://telegra.ph/file/9d38415096b6c46bf03f8.jpg') as string
    const buffer = await httpBuffer(profilePic)
    const {limite, nombre, registered, edad, marry, gender, birthday} = user
    const level = user.level ?? 0
    const phone = formatPhoneNumber(who)

    let nacionalidad = 'Desconocida'
    try {
        const data = await httpJson<CountryResponse>(`${info.apis}/tools/country?text=${phone}`)
        if (data?.result?.name) nacionalidad = `${data.result.name} ${data.result.emoji}`
    } catch (_) {
    }

    let relacion = '❌ *No estás en ninguna relación, solter@ 🤑.*'
    if (marry) {
        const nombrePareja = await getUserName(marry) || 'Desconocido'
        relacion = `💍 *Está en una relación con:* ${nombrePareja}`
    }

    const texto = `*「 PERFIL 」*

👤 *Nombre:* ${nombre}
☎️ *Número:* ${phone}
🌐 *Link:* wa.me/${who.split('@')[0]}
🌍 *Nacionalidad:* ${nacionalidad} ${edad ? `\n🎈 *Edad:* ${edad}` : ''} ${gender ? `\n⚧️ *Género:* ${gender}` : ''} ${birthday ? `\n🎂 *Cumpleaños:* ${moment(birthday).format('DD/MM/YYYY')}` : ''}
💎 *Límite:* ${limite ?? 0}
⚙️ *Nivel:* ${level}
◯ *Registrado:* ${registered ? 'Sí' : 'No'}

${relacion}

*•━━━━⪻ 𝙿𝙴𝚁𝙵𝙸𝙻 ⪼━━━━•*`
    await conn.sendFile(m.chat, buffer, 'perfil.jpg', texto, m)
    }
})

