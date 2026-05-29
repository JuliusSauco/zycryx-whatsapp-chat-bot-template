import {definePlugin} from '../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21
import {
    getMarriageRequest,
    getUserById,
    getUserName,
    marryUsers,
    setMarriageRequest,
} from '../services/user.service.js'

export default definePlugin({
    help: ['marry @tag'],
    tags: ['econ'],
    command: ['marry', 'pareja'],
    register: true,
    async before(m) {
    const req = await getMarriageRequest(m.sender)
    if (!req) return

    const response = m.originalText.toLowerCase()
    if (response === 'aceptar') {
        await marryUsers(m.sender, req)
        // @ts-ignore
        await conn.reply(m.chat, `✅ ¡Felicidades! 🥳\n@${req.split('@')[0]} y @${m.sender.split('@')[0]} ahora están casados`, m, {mentions: [req, m.sender]})
    } else if (response === 'rechazar') {
        await setMarriageRequest(m.sender, null)
        // @ts-ignore
        await conn.reply(m.chat, `⚠️ Has rechazado la solicitud de matrimonio de @${req.split('@')[0]}`, m, {mentions: [req]})
    }

    },
    async execute(m, {conn, args}) {
    const user = await getUserById(m.sender)
    if (!user) return m.reply('⚠️ No apareces en mi base de datos.')

    if (user.marry) {
        const spouseName = await getUserName(user.marry) || 'sin nombre'
        if (user.marry === (m.mentionedJid[0] || '')) return conn.reply(m.chat, `⚠️ Ya estás casado con @${user.marry.split('@')[0]}. No necesitas casarte de nuevo con la misma persona 🤨`, m, {mentions: [m.sender]})
        return conn.reply(m.chat, `⚠️ Ya estás casado con @${user.marry.split('@')[0]} (${spouseName}).\n¿Acaso le vas a ser infiel? 🤨`, m, {mentions: [m.sender]})
    }

    const mentionedUser = m.mentionedJid[0]
    if (!mentionedUser) return m.reply('⚠️ Etiqueta a la persona con la que te quieres casar usando @tag')
    if (mentionedUser === m.sender) return m.reply("⚠️ No puedes casarte contigo mismo")

    const check = await getUserById(mentionedUser)
    if (!check) return m.reply('⚠️ El usuario al que intentas casar no está en mi base de datos.')
    if (check.marry) return m.reply(`⚠️ El usuario ya está casado con alguien más`)

    await setMarriageRequest(mentionedUser, m.sender)
    await conn.reply(m.chat, `💍 *@${m.sender.split('@')[0]}* se está declarando!! 😳\n@${mentionedUser.split('@')[0]} responde:\n\n❤️ Escribe *Aceptar*\n💔 Escribe *Rechazar*`, m, {mentions: [m.sender, mentionedUser]})

    setTimeout(async () => {
        const again = await getMarriageRequest(mentionedUser)
        if (again) {
            await setMarriageRequest(mentionedUser, null)
            await conn.reply(m.chat, '⚠️ El tiempo para aceptar o rechazar ha expirado.', m)
        }
    }, 60000)
    }
})


