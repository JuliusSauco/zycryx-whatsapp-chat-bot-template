import {defineSdkPlugin} from '../../core/plugin-sdk.js'
import {exchangeWalletResources, getWallet} from '../../services/wallet.service.js'

export default defineSdkPlugin({
    help: ['dep', 'depositar', 'retirar', 'toremove'],
    tags: ['econ'],
    command: /^(dep|depositar|retirar|toremove)$/i,
    register: true,
    async execute(m, {command, args, sdk}) {
    const user = await getWallet(m.sender)
    if (!user) return sdk.reply.message('rpg.shared.missingUser')
    const limite = user.limite ?? 0
    const banco = user.banco ?? 0

    if (command === 'dep' || command === 'depositar') {
        if (!args[0]) return sdk.reply.message('rpg.bank.missingDepositAmount')

        if (/all/i.test(args[0])) {
            if (limite < 1) return sdk.reply.message('rpg.bank.emptyWallet')
            await exchangeWalletResources({userId: m.sender, from: 'limite', to: 'banco', fromAmount: limite, toAmount: limite})
            return sdk.reply.message('rpg.bank.depositAll', {amount: limite})
        }

        const amount = Number(args[0])
        if (isNaN(amount)) return sdk.reply.message('rpg.bank.invalidDepositAmount')
        if (amount < 1) return sdk.reply.message('rpg.bank.minimumAmount')
        if (limite < amount) return sdk.reply.message('rpg.bank.notEnoughWallet')

        await exchangeWalletResources({userId: m.sender, from: 'limite', to: 'banco', fromAmount: amount, toAmount: amount})
        return sdk.reply.message('rpg.bank.deposit', {amount})
    }

    if (command === 'retirar' || command === 'toremove') {
        if (!args[0]) return sdk.reply.message('rpg.bank.missingWithdrawAmount')

        if (/all/i.test(args[0])) {
            if (banco < 1) return sdk.reply.message('rpg.bank.emptyBank')
            await exchangeWalletResources({userId: m.sender, from: 'banco', to: 'limite', fromAmount: banco, toAmount: banco})
            return sdk.reply.message('rpg.bank.withdrawAll', {amount: banco})
        }

        const amount = Number(args[0])
        if (isNaN(amount)) return sdk.reply.message('rpg.bank.invalidWithdrawAmount')
        if (amount < 1) return sdk.reply.message('rpg.bank.minimumAmount')
        if (banco < amount) return sdk.reply.message('rpg.bank.notEnoughBank')

        await exchangeWalletResources({userId: m.sender, from: 'banco', to: 'limite', fromAmount: amount, toAmount: amount})
        return sdk.reply.message('rpg.bank.withdraw', {amount})
    }
    }
})

