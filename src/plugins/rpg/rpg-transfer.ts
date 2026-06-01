import {definePlugin} from '../../core/define-plugin.js'
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
    if (!user || !userTo) return m.reply('❌ Usuarios no válidos.')

    if (/^no$/i.test(m.originalText)) {
        clearTimeout(timeout)
        delete confirmation[sender]
        return m.reply('*CANCELADO*')
    }

    if (/^si$/i.test(m.originalText)) {
        if (!isWalletResource(type)) return m.reply('❌ Recurso inválido.')
        const transferred = await transferWalletResource({from: sender, to, resource: type, amount: count})
        if (!transferred) return m.reply(`⚠️ *𝙉𝙊 𝙏𝙄𝙀𝙉𝙀 𝙎𝙐𝙁𝙄𝘾𝙄𝙀𝙉𝙏𝙀 ${type.toUpperCase()}*`)
        m.reply(`✅ *TRANSFERENCIA HECHA:*\n\n*${count} ${type} para* @${(to || '').replace(/@s\.whatsapp\.net/g, '')}`, null, {mentions: [to]})
        clearTimeout(timeout)
        delete confirmation[sender]
    }

    },
    async execute(m, {conn, args, usedPrefix, command}) {
    if (confirmation[m.sender]) return m.reply('𝙀𝙨𝙩𝙖𝙨 𝙝𝙖𝙘𝙞𝙚𝙣𝙙𝙤 𝙪𝙣𝙖 𝙩𝙧𝙖𝙣𝙨𝙛𝙚𝙧𝙚𝙣𝙘𝙞𝙖')

    let user = await getWallet(m.sender)
    if (!user) return
    let lol = `\`⧼⧼⧼ 💱 𝙏𝙍𝘼𝙉𝙎𝙁𝙀𝙍𝙀𝙉𝘾𝙄𝘼 💱 ⧽⧽⧽\`

> *${usedPrefix + command} tipo cantidad @tag*

\`❏ 𝙀𝙅𝙀𝙈𝙋𝙇𝙊 :\`
* *${usedPrefix + command} exp 30 @0*

┏•「 *✅ 𝙍𝙀𝘾𝙐𝙍𝙎𝙊𝙎 𝘿𝙄𝙎𝙋𝙊𝙉𝙄𝘽𝙇𝙀𝙎* 」
┃
┃ 💎 𝘿𝙞𝙖𝙢𝙖𝙣𝙩𝙚𝙨 = limite
┃ 🪙 𝙇𝙤𝙡𝙞𝘾𝙤𝙞𝙣𝙨 = money 
┃ ⚡ 𝙀𝙭𝙥𝙚𝙧𝙞𝙚𝙣𝙘𝙞𝙖 = exp 
┗•`.trim()

    const type = (args[0] || '').toLowerCase()
    if (!isWalletResource(type)) return m.reply(lol, m.chat, {mentions: await conn.parseMention(lol)})
    const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, (isNumber(args[1]) ? parseInt(args[1]) : 1))) * 1
    let who = m.mentionedJid?.[0] || (args[2] ? (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : '')
    if (!who) return m.reply('⚠️ *𝙀𝙏𝙄𝙌𝙐𝙀𝙏𝙀 𝘼𝙇 𝙐𝙎𝙐𝘼𝙍𝙄𝙊*')
    let userTo = await getWallet(who)
    if (!userTo) return m.reply(`⚠️ *𝙀𝙇 𝙐𝙎𝙐𝘼𝙍𝙄𝙊 ${who} 𝙉𝙊 𝙎𝙀 𝙀𝙉𝘾𝙐𝙀𝙉𝙏𝙍𝘼 𝙀𝙉 𝙈𝙄 db*`)
    if (user[type] * 1 < count) return m.reply(`⚠️ *𝙉𝙊 𝙏𝙄𝙀𝙉𝙀 𝙎𝙐𝙁𝙄𝘾𝙄𝙀𝙉𝙏𝙀 ${type.toUpperCase()}*`)

    let confirm = `\`ESTÁS A PUNTO DE HACER ESTA TRANSFERENCIA\`

> 💹 *${count} ${type} para* *@${(who || '').replace(/@s\.whatsapp\.net/g, '')}*

\`¿DESEAS CONTINUAR?\`
> Tienes 60 segundos.

> Escribe: (si) para aceptar
> Escribe: (no) para cancelar`.trim()

    await conn.reply(m.chat, confirm, m, {mentions: [who]})

    confirmation[m.sender] = {
        sender: m.sender,
        to: who,
        message: m,
        type,
        count,
        timeout: setTimeout(() => {
            m.reply('*SU TIEMPO SE HA TERMINADO*')
            delete confirmation[m.sender]
        }, 60 * 1000)
    }
    }
})


function special(type: string) {
    let b = type.toLowerCase()
    let special = (['common', 'uncoommon', 'mythic', 'legendary', 'pet'].includes(b) ? ' Crate' : '')
    return special
}

function isNumber(x: string | undefined) {
    return x !== undefined && !isNaN(Number(x))
}
