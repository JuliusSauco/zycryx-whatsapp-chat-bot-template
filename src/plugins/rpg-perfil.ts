import {definePlugin} from '../core/define-plugin.js'
import {createHash} from 'crypto'
import fetch from 'node-fetch'
import moment from 'moment-timezone'
import {xpRange} from '../lib/levelling.js'
import {getUserById, getUserName} from '../services/user.service.js'

const formatPhoneNumber = (jid: any) => {
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
    let who = m.mentionedJid?.[0] || (m.fromMe ? (conn as any).user?.jid || m.sender : m.sender)

    const user = await getUserById(who)
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.')
    const bio = await conn.fetchStatus(who).catch(() => ({})) as any
    const biot = bio.status || 'Sin Info'
    const profilePic = await conn.profilePictureUrl(who, 'image').catch((_: any) => 'https://telegra.ph/file/9d38415096b6c46bf03f8.jpg') as string
    const buffer = await (await fetch(profilePic)).buffer()
    const {exp, limite, nombre, registered, edad, level, marry, gender, birthday} = user
    const {min, xp, max} = xpRange(level, global.multiplier || 1)
    const sn = createHash('md5').update(String(who)).digest('hex')
    const phone = formatPhoneNumber(who)

    let nacionalidad = 'Desconocida'
    try {
        const response = await fetch(`${info.apis}/tools/country?text=${phone}`)
        const data = await response.json() as any
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

