import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {createPendingActionStore} from '../../lib/ephemeral-state.js'
import {getWallet, isWalletResource, transferWalletResource} from '../../services/wallet.service.js'
import type {BotMessage} from '../../types/message.js'
import type {WalletResource} from '../../domain/users.js'
import {content} from '../../services/content.service.js';

interface TransferConfirmation {
    sender: string;
    to: string;
    message: BotMessage;
    type: WalletResource;
    count: number;
}

const confirmations = createPendingActionStore<TransferConfirmation>({
    ttlMs: 60 * 1000,
    onExpire: (_sender, confirmation) => {
        void confirmation.message.reply(content.message('rpg.transfer.timeout'));
    },
})

export default defineSdkPlugin({
    help: ['transfer'].map(v => v + ' [tipo] [cantidad] [@tag]'),
    tags: ['econ'],
    command: ['payxp', 'transfer', 'darxp', 'dar', 'enviar', 'transferir'],
    register: true,
    async before(m) {
    const confirmation = confirmations.get(m.sender)
    if (!confirmation) return
    if (!m.originalText) return

    let {sender, message, to, type, count} = confirmation
    if (m.id === message.id) return

    let user = await getWallet(sender)
    let userTo = await getWallet(to)
    if (!user || !userTo) return m.reply(content.message('rpg.transfer.invalidUsers'))

    if (/^no$/i.test(m.originalText)) {
        confirmations.cancel(sender)
        return m.reply(content.message('rpg.transfer.cancelled'))
    }

    if (/^si$/i.test(m.originalText)) {
        if (!isWalletResource(type)) return m.reply(content.message('rpg.transfer.invalidResource'))
        const transferred = await transferWalletResource({from: sender, to, resource: type, amount: count})
        if (!transferred) return m.reply(content.renderMessage('rpg.transfer.notEnough', {resource: type.toUpperCase()}))
        m.reply(content.renderMessage('rpg.transfer.success', {
            amount: count,
            resource: type,
            user: (to || '').replace(/@s\.whatsapp\.net/g, '')
        }), null, {mentions: [to]})
        confirmations.cancel(sender)
    }

    },
    async execute(m, {conn, args, usedPrefix, command, sdk}) {
    if (confirmations.get(m.sender)) return sdk.reply.message('rpg.transfer.alreadyPending')

    let user = await getWallet(m.sender)
    if (!user) return
    let lol = sdk.content.renderMessage('rpg.transfer.usage', {
        command: usedPrefix + command
    }).trim()

    const type = (args[0] || '').toLowerCase()
    if (!isWalletResource(type)) return sdk.reply.text(lol, m.chat, {mentions: await conn.parseMention(lol)})
    const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, (isNumber(args[1]) ? parseInt(args[1]) : 1))) * 1
    let who = m.mentionedJid?.[0] || (args[2] ? (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : '')
    if (!who) return sdk.reply.message('rpg.transfer.missingTarget')
    let userTo = await getWallet(who)
    if (!userTo) return sdk.reply.message('rpg.transfer.targetNotFound', {user: who})
    if (user[type] * 1 < count) return sdk.reply.message('rpg.transfer.notEnough', {resource: type.toUpperCase()})

    let confirm = sdk.content.renderMessage('rpg.transfer.confirm', {
        amount: count,
        resource: type,
        user: (who || '').replace(/@s\.whatsapp\.net/g, '')
    }).trim()

    await conn.reply(m.chat, confirm, m, {mentions: [who]})

    confirmations.start(m.sender, {
        sender: m.sender,
        to: who,
        message: m,
        type,
        count,
    })
    }
})


function isNumber(x: string | undefined) {
    return x !== undefined && !isNaN(Number(x))
}
