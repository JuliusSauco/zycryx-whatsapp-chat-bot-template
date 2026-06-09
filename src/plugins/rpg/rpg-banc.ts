import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {exchangeWalletResources, getWallet} from '../../services/wallet.service.js'

export default definePlugin({
    help: ['dep', 'depositar', 'retirar', 'toremove'],
    tags: ['econ'],
    command: /^(dep|depositar|retirar|toremove)$/i,
    register: true,
    async execute(m, {command, args}) {
    const user = await getWallet(m.sender)
    if (!user) return m.reply(getRequiredPluginMessage('rpg.shared.missingUser'))
    const limite = user.limite ?? 0
    const banco = user.banco ?? 0

    if (command === 'dep' || command === 'depositar') {
        if (!args[0]) return m.reply(getRequiredPluginMessage('rpg.bank.missingDepositAmount'))

        if (/all/i.test(args[0])) {
            if (limite < 1) return m.reply(getRequiredPluginMessage('rpg.bank.emptyWallet'))
            await exchangeWalletResources({userId: m.sender, from: 'limite', to: 'banco', fromAmount: limite, toAmount: limite})
            return m.reply(renderTemplate(getRequiredPluginMessage('rpg.bank.depositAll'), {amount: limite}))
        }

        const amount = Number(args[0])
        if (isNaN(amount)) return m.reply(getRequiredPluginMessage('rpg.bank.invalidDepositAmount'))
        if (amount < 1) return m.reply(getRequiredPluginMessage('rpg.bank.minimumAmount'))
        if (limite < amount) return m.reply(getRequiredPluginMessage('rpg.bank.notEnoughWallet'))

        await exchangeWalletResources({userId: m.sender, from: 'limite', to: 'banco', fromAmount: amount, toAmount: amount})
        return m.reply(renderTemplate(getRequiredPluginMessage('rpg.bank.deposit'), {amount}))
    }

    if (command === 'retirar' || command === 'toremove') {
        if (!args[0]) return m.reply(getRequiredPluginMessage('rpg.bank.missingWithdrawAmount'))

        if (/all/i.test(args[0])) {
            if (banco < 1) return m.reply(getRequiredPluginMessage('rpg.bank.emptyBank'))
            await exchangeWalletResources({userId: m.sender, from: 'banco', to: 'limite', fromAmount: banco, toAmount: banco})
            return m.reply(renderTemplate(getRequiredPluginMessage('rpg.bank.withdrawAll'), {amount: banco}))
        }

        const amount = Number(args[0])
        if (isNaN(amount)) return m.reply(getRequiredPluginMessage('rpg.bank.invalidWithdrawAmount'))
        if (amount < 1) return m.reply(getRequiredPluginMessage('rpg.bank.minimumAmount'))
        if (banco < amount) return m.reply(getRequiredPluginMessage('rpg.bank.notEnoughBank'))

        await exchangeWalletResources({userId: m.sender, from: 'banco', to: 'limite', fromAmount: amount, toAmount: amount})
        return m.reply(renderTemplate(getRequiredPluginMessage('rpg.bank.withdraw'), {amount}))
    }
    }
})

