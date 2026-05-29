import {definePlugin} from '../core/define-plugin.js'
import {exchangeWalletResources, getWallet} from '../services/wallet.service.js'

export default definePlugin({
    help: ['dep', 'depositar', 'retirar', 'toremove'],
    tags: ['econ'],
    command: /^(dep|depositar|retirar|toremove)$/i,
    register: true,
    async execute(m, {conn, command, args}) {
    const user = await getWallet(m.sender)
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.')
    const limite = user.limite ?? 0
    const banco = user.banco ?? 0

    if (command === 'dep' || command === 'depositar') {
        if (!args[0]) return m.reply(`[ ⚠️ ] *Ingresa la cantidad para agregar a tu cuenta bancaria*`)

        if (/all/i.test(args[0])) {
            if (limite < 1) return m.reply(`*Estás pobre, no tienes diamantes*`)
            await exchangeWalletResources({userId: m.sender, from: 'limite', to: 'banco', fromAmount: limite, toAmount: limite})
            return m.reply(`*[ 🏦 ] Has agregado ${limite} diamantes al Banco.*`)
        }

        if (isNaN(args[0] as any)) return m.reply(`[ ⚠️ ] *Falta un número válido de diamantes 💎*`)
        const amount = parseInt(args[0])
        if (amount < 1) return m.reply(`❌ El mínimo es 1 diamante.`)
        if (limite < amount) return m.reply(`*Che, no sabes cuánto tienes en tu cartera? Usa el comando:* #bal`)

        await exchangeWalletResources({userId: m.sender, from: 'limite', to: 'banco', fromAmount: amount, toAmount: amount})
        return m.reply(`*[ 🏦 ] Has ingresado ${amount} diamantes al Banco*`)
    }

    if (command === 'retirar' || command === 'toremove') {
        if (!args[0]) return m.reply(`[ ⚠️ ] *Ingresa la cantidad a retirar*`)

        if (/all/i.test(args[0])) {
            if (banco < 1) return m.reply(`Hey fantasma 👻, no tienes nada en el banco 🥲`)
            await exchangeWalletResources({userId: m.sender, from: 'banco', to: 'limite', fromAmount: banco, toAmount: banco})
            return m.reply(`*[ 🏦 ] Retiraste ${banco} diamantes 💎 del Banco.*`)
        }

        if (isNaN(args[0] as any)) return m.reply(`La cantidad debe ser un número válido.`)
        const amount = parseInt(args[0])
        if (amount < 1) return m.reply(`❌ El mínimo es 1 diamante.`)
        if (banco < amount) return m.reply(`*Che, no sabes cuánto tienes en tu cuenta? Usa el comando:* #bal`)

        await exchangeWalletResources({userId: m.sender, from: 'banco', to: 'limite', fromAmount: amount, toAmount: amount})
        return m.reply(`*[ 🏦 ] Has retirado ${amount} diamantes del Banco*`)
    }
    }
})

