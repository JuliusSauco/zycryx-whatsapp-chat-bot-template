import {botInfo} from "../../core/config.js";
import {getPrivateWarn, setPrivateWarn} from '../../services/user.service.js'
import type {BeforePluginContext} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'

export const beforePolicy = {phase: 'security', priority: 110, failurePolicy: 'fail-closed'} as const
import {content} from '../../services/content.service.js'
import {pickRandom} from '../../utils/random.js'

export const PRIVATE_ALLOWED_COMMANDS = [
    'code', 'serbot', 'jadibot', 'bots', 'piedra', 'tijera', 'papel',
    'wallet', 'ewallet', 'balance', 'bal', 'diamantes', 'diamond',
    'bank', 'banco', 'deposit', 'dep', 'depositar', 'withdraw', 'retirar', 'toremove', 'loan', 'bankreserve',
    'buy', 'buyall', 'exchange',
] as const

export function isPrivateCommandAllowed(command: string): boolean {
    return PRIVATE_ALLOWED_COMMANDS.includes(command as typeof PRIVATE_ALLOWED_COMMANDS[number])
}

function pickOfficialGroupLink(): string {
    return pickRandom([botInfo.nn, botInfo.nn2, botInfo.nn3, botInfo.nn4, botInfo.nn5, botInfo.nn6])
}

function privateBlockedMessage(): string {
    return content.renderMessage('hooks.antiPrivate.blocked', {
        groupLink: pickOfficialGroupLink()
    })
}

export async function before(m: BotMessage, {isOwner, botConfig}: BeforePluginContext) {
    const sender = m.sender
    const texto = m.originalText?.toLowerCase().trim() || m.text?.toLowerCase().trim() || ''

    if (m.isGroup || m.fromMe || isOwner) {
        return
    }

    if (!botConfig.anti_private) return
    const prefixes = Array.isArray(botConfig.prefix) ? botConfig.prefix : [botConfig.prefix || '/']

    let usedPrefix = ''
    for (const prefix of prefixes) {
        if (texto.startsWith(prefix)) {
            usedPrefix = prefix
            break
        }
    }

    const withoutPrefix = texto.slice(usedPrefix.length).trim()
    const [commandName] = withoutPrefix.split(/\s+/)
    const command = commandName ? commandName.toLowerCase() : ''

    if (isPrivateCommandAllowed(command)) {
        return
    }

    try {
        const warned = await getPrivateWarn(sender)

        if (warned === null) {
            await setPrivateWarn(sender, true)
            await m.reply(privateBlockedMessage())
            return false
        }

        if (!warned) {
            await setPrivateWarn(sender, true)
            await m.reply(privateBlockedMessage())
            return false
        }

        return false
    } catch (e: unknown) {
        return false
    }
}
