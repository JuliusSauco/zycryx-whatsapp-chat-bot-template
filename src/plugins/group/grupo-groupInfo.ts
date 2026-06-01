import {definePlugin} from '../../core/define-plugin.js'
import {getGroupSettings} from '../../services/group-settings.service.js'
import {getNumberByLid} from '../../services/user.service.js'

export default definePlugin({
    help: ['infogp'],
    tags: ['group'],
    command: ['infogrupo', 'groupinfo', 'infogp'],
    group: true,
    register: true,
    async execute(m, {conn}) {
    const pp = await conn.profilePictureUrl(m.chat, 'image').catch(() => "https://telegra.ph/file/39fb047cdf23c790e0146.jpg")

    let groupMetadata
    try {
        groupMetadata = await conn.groupMetadata(m.chat)
    } catch (e: unknown) {
        return m.reply('*⚠️ Error al obtener información del grupo. Intenta nuevamente más tarde.*')
    }
    const participants = groupMetadata.participants || []
    const groupAdmins = participants.filter(p => p.admin)
    const usarLid = participants.some(p => p.id?.endsWith?.('@lid'))
    const listAdmin = await Promise.all(groupAdmins.map(async v => {
        let numero = null
        if (usarLid && v.id.endsWith('@lid')) {
            numero = await getNumberByLid(v.id)
        } else if (/^\d+@s\.whatsapp\.net$/.test(v.id)) {
            numero = v.id.split('@')[0]
        }
        return `➥ ${numero ? `@${numero}` : `@Usuarios`}`
    }))

    const data = await getGroupSettings(m.chat) || {}
    const {welcome, detect, antifake, antilink, virusTotal, modoadmin, primary_bot, modohorny, nsfw_horario, banned, messageLogging} = data
    const fallbackOwner = m.chat.includes('-') ? m.chat.split('-')[0] + '@s.whatsapp.net' : null
    const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || fallbackOwner || "Desconocido"

    let primaryBotMention = ''
    if (primary_bot) {
        primaryBotMention = `@${primary_bot.split('@')[0]}`
    }

    const text = `『 ＩＮＦＯ ＤＥ ＧＲＵＰＯ 』

*• ID :* 
${groupMetadata.id}

*• Nombre :* 
${groupMetadata.subject}

*• Miembros :*
${participants.length}

*• Creador del grupo :*
@${owner.split('@')[0]}

*• Admins :*
${listAdmin.join('\n')}

*• 𝙲𝙾𝙽𝙵𝙸𝙶𝚄𝚁𝙰𝙲𝙸𝙾𝙽 𝙳𝙴𝙻 𝙶𝚁𝚄𝙿𝙾 :*
• Bot : ${modoadmin ? 'Apagado 📴' : `${primaryBotMention || 'Online ✅'}`} 
• Bienvenida: ${welcome ? '✅' : '❌'}
• AntiLink: ${antilink ? '✅' : '❌'}
• VirusTotal: ${virusTotal ? '✅' : '❌'}
• AntiFake: ${antifake ? '✅' : '❌'}
• Detect: ${detect ? '✅' : '❌'}
• Modo horny: ${modohorny ? '✅' : '❌'}
• NSFW horario permitido: ${nsfw_horario ? `🕒 (${nsfw_horario})` : '❌'}
• Registro mensajes: ${messageLogging ? '✅' : '❌'}
• Grupo baneado: ${banned ? '🚫 Sí' : '✅ No'}
`.trim()
    await conn.sendFile(m.chat, pp, 'pp.jpg', text, m)
    }
})

