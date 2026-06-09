import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {getWallet, isWalletResource, transferWalletResource} from '../../services/wallet.service.js'
import type {BotMessage} from '../../types/message.js'
import type {WalletResource} from '../../ports/repositories.js'

interface TransferConfirmation {
    sender: string;
    to: string;
    message: BotMessage;
    type: WalletResource;
    count: number;
    timeout: ReturnType<typeof setTimeout>;
}

let confirmation: Record<string, TransferConfirmation> = {}

export default definePlugin({
    help: ['transfer'].map(v => v + ' [tipo] [cantidad] [@tag]'),
    tags: ['econ'],
    command: ['payxp', 'transfer', 'darxp', 'dar', 'enviar', 'transferir'],
    register: true,
    async before(m) {
    if (!(m.sender in confirmation)) return
    if (!m.originalText) return

    let {timeout, sender, message, to, type, count} = confirmation[m.sender]
    if (m.id === message.id) return

    let user = await getWallet(sender)
    let userTo = await getWallet(to)
    if (!user || !userTo) return m.reply(getRequiredPluginMessage('rpg.transfer.invalidUsers'))

    if (/^no$/i.test(m.originalText)) {
        clearTimeout(timeout)
        delete confirmation[sender]
        return m.reply(getRequiredPluginMessage('rpg.transfer.cancelled'))
    }

    if (/^si$/i.test(m.originalText)) {
        if (!isWalletResource(type)) return m.reply(getRequiredPluginMessage('rpg.transfer.invalidResource'))
        const transferred = await transferWalletResource({from: sender, to, resource: type, amount: count})
        if (!transferred) return m.reply(renderTemplate(getRequiredPluginMessage('rpg.transfer.notEnough'), {resource: type.toUpperCase()}))
        m.reply(renderTemplate(getRequiredPluginMessage('rpg.transfer.success'), {
            amount: count,
            resource: type,
            user: (to || '').replace(/@s\.whatsapp\.net/g, '')
        }), null, {mentions: [to]})
        clearTimeout(timeout)
        delete confirmation[sender]
    }

    },
    async execute(m, {conn, args, usedPrefix, command}) {
    if (confirmation[m.sender]) return m.reply(getRequiredPluginMessage('rpg.transfer.alreadyPending'))

    let user = await getWallet(m.sender)
    if (!user) return
    let lol = renderTemplate(getRequiredPluginMessage('rpg.transfer.usage'), {
        command: usedPrefix + command
    }).trim()

    const type = (args[0] || '').toLowerCase()
    if (!isWalletResource(type)) return m.reply(lol, m.chat, {mentions: await conn.parseMention(lol)})
    const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, (isNumber(args[1]) ? parseInt(args[1]) : 1))) * 1
    let who = m.mentionedJid?.[0] || (args[2] ? (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : '')
    if (!who) return m.reply(getRequiredPluginMessage('rpg.transfer.missingTarget'))
    let userTo = await getWallet(who)
    if (!userTo) return m.reply(renderTemplate(getRequiredPluginMessage('rpg.transfer.targetNotFound'), {user: who}))
    if (user[type] * 1 < count) return m.reply(renderTemplate(getRequiredPluginMessage('rpg.transfer.notEnough'), {resource: type.toUpperCase()}))

    let confirm = renderTemplate(getRequiredPluginMessage('rpg.transfer.confirm'), {
        amount: count,
        resource: type,
        user: (who || '').replace(/@s\.whatsapp\.net/g, '')
    }).trim()

    await conn.reply(m.chat, confirm, m, {mentions: [who]})

    confirmation[m.sender] = {
        sender: m.sender,
        to: who,
        message: m,
        type,
        count,
        timeout: setTimeout(() => {
            m.reply(getRequiredPluginMessage('rpg.transfer.timeout'))
            delete confirmation[m.sender]
        }, 60 * 1000)
    }
    }
})


function isNumber(x: string | undefined) {
    return x !== undefined && !isNaN(Number(x))
}
