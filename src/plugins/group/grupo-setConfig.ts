import {definePlugin} from '../../core/define-plugin.js'
import {setGroupTextMessage} from '../../services/group-settings.service.js'

export default definePlugin({
    help: ['setwelcome <texto>', 'setbye <texto>'],
    tags: ['group'],
    command: ['setwelcome', 'setbye', 'setpromote', 'setdemote'],
    admin: true,
    group: true,
    register: true,
    async execute(m, {args, command, conn, text}) {
    if (!text) {
        const tipo = command === 'setwelcome' ? 'bienvenida' : command === 'setbye' ? 'despedida' : command === 'setpromote' ? 'ascenso' : 'degradación'

        const variables = ['@user → Menciona al usuario',
            ...(command !== 'setpromote' && command !== 'setdemote' ? ['@group → Nombre del grupo'] : []),
            ...(command === 'setwelcome' ? ['@desc → Descripción del grupo'] : []),
            ...(command === 'setpromote' || command === 'setdemote' ? ['@author → Quien ejecuta la acción'] : [])
        ].join('\n• ')

        const opciones = (command === 'setwelcome' || command === 'setbye') ? `*Opciones adicionales:*
• --foto → Para enviar el mensaje con imagen
• --nofoto → Para enviar solo texto
• --groupfoto → Para priorizar la foto del grupo
• --nogroupfoto → Para priorizar la foto del usuario
• --hidetag → Para mencionar a todos
• --nohidetag → Para mencionar solo al usuario` : ''

        const ejemplo = command === 'setwelcome' ? `Hola @user, bienvenido a @group. Lee las reglas: @desc`
            : command === 'setbye' ? `Chao @user, gracias por estar en @group.`
                : command === 'setpromote' ? `@user ha sido promovido por @author.`
                    : `@user ha sido degradado por @author.`

        return m.reply(`*⚙️ Personaliza el mensaje de ${tipo} del grupo:*

*Puedes usar las siguientes variables:*
• ${variables}\n${opciones}
*Ejemplo de uso:*
➤ /${command} ${ejemplo} --foto`)
    }

    const hasFoto = text.includes('--foto')
    const hasNoFoto = text.includes('--nofoto')
    const hasHidetag = text.includes('--hidetag')
    const hasNoHidetag = text.includes('--nohidetag')
    const hasGroupFoto = text.includes('--groupfoto')
    const hasNoGroupFoto = text.includes('--nogroupfoto')
    const cleanText = text
        .replace('--foto', '')
        .replace('--nofoto', '')
        .replace('--groupfoto', '')
        .replace('--nogroupfoto', '')
        .replace('--hidetag', '')
        .replace('--nohidetag', '')
        .trim()
    const photoMode = hasFoto ? true : hasNoFoto ? false : undefined
    const hidetag = hasHidetag ? true : hasNoHidetag ? false : undefined
    const groupPhoto = hasGroupFoto ? true : hasNoGroupFoto ? false : undefined

    if (command === 'setwelcome') {
        await setGroupTextMessage(m.chat, 'welcome', cleanText, photoMode, {
            registeredBy: m.lid || m.sender,
            hidetag,
            groupPhoto,
        })
        return m.reply(`✅ Mensaje de bienvenida guardado${hasFoto ? ' con imagen' : hasNoFoto ? ' sin imagen' : ''}${hasGroupFoto ? ' priorizando foto del grupo' : hasNoGroupFoto ? ' priorizando foto del usuario' : ''}${hasHidetag ? ' con hidetag' : hasNoHidetag ? ' sin hidetag' : ''}.`)
    }

    if (command === 'setbye') {
        await setGroupTextMessage(m.chat, 'bye', cleanText, photoMode, {
            registeredBy: m.lid || m.sender,
            hidetag,
            groupPhoto,
        })
        return m.reply(`✅ Mensaje de despedida guardado${hasFoto ? ' con imagen' : hasNoFoto ? ' sin imagen' : ''}${hasGroupFoto ? ' priorizando foto del grupo' : hasNoGroupFoto ? ' priorizando foto del usuario' : ''}${hasHidetag ? ' con hidetag' : hasNoHidetag ? ' sin hidetag' : ''}.`)
    }

    if (command === 'setpromote') {
        await setGroupTextMessage(m.chat, 'promote', cleanText)
        return m.reply("✅ Mensaje de ascenso guardado.")
    }

    if (command === 'setdemote') {
        await setGroupTextMessage(m.chat, 'demote', cleanText)
        return m.reply("✅ Mensaje de degradación guardado.")
    }
    }
})

