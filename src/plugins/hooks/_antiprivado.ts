import {getSubbotConfig} from '../../services/subbot.service.js'
import {getPrivateWarn, setPrivateWarn} from '../../services/user.service.js'
import type {ExtendedConn} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'

const comandosPermitidos = ['code', 'serbot', 'jadibot', 'bots', 'piedra', 'tijera', 'papel']

export async function before(m: BotMessage, {conn, isOwner}: {conn: ExtendedConn; isOwner: boolean}) {
    const botId = conn.user?.id || globalThis.conn.user?.id || ''
    const config = await getSubbotConfig(botId)
    const chatId = m.chat || m.key?.remoteJid || ''
    const sender = m.sender
    const texto = m.originalText?.toLowerCase().trim() || m.text?.toLowerCase().trim() || ''

    if (m.isGroup || m.fromMe || isOwner) {
        return
    }

    if (!config.anti_private) return
    const prefixes = Array.isArray(config.prefix) ? config.prefix : [config.prefix || '/']

    let usedPrefix = ''
    for (const prefix of prefixes) {
        if (texto.startsWith(prefix)) {
            usedPrefix = prefix
            break
        }
    }

    const withoutPrefix = texto.slice(usedPrefix.length).trim()
    const [commandName, ...args] = withoutPrefix.split(/\s+/)
    const command = commandName ? commandName.toLowerCase() : ''

    if (comandosPermitidos.includes(command)) {
        return
    }

    try {
        const warned = await getPrivateWarn(sender)

        if (warned === null) {
            await setPrivateWarn(sender, true)
            await m.reply(`Hola, está prohibido usar los comandos en privado...\n\n*\`🔰 SI QUIERES HACERTE UN SUB BOT, USA LOS SIGUIENTES COMANDOS:\`*\n/serbot\n/code\n\n> _*Para usar mis funciones, únete al grupo oficial 👇*_\n${[info.nn, info.nn2, info.nn3, info.nn4, info.nn5, info.nn6].getRandom()}`)
            return false
        }

        if (!warned) {
            await setPrivateWarn(sender, true)
            await m.reply(`Hola, está prohibido usar los comandos en privado...\n\n*\`🔰 SI QUIERES HACERTE UN SUB BOT, USA LOS SIGUIENTES COMANDOS:\`*\n/serbot\n/code\n\n> _*Para usar mis funciones, únete al grupo oficial 👇*_\n${[info.nn, info.nn2, info.nn3, info.nn4, info.nn5, info.nn6].getRandom()}`)
            return false
        }

        return false
    } catch (e: unknown) {
        return false
    }
}
