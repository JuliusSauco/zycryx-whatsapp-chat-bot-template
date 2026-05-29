import {definePlugin} from '../core/define-plugin.js'
import {exchangeWalletResources, getWallet} from '../services/wallet.service.js';

const xpperlimit = 750;

export default definePlugin({
    help: ['buy [cantidad]', 'buyall', 'buy all'],
    tags: ['econ'],
    command: /^buy(all)?$/i,
    register: true,
    async execute(m, {conn, command, args}) {
    let user = await getWallet(m.sender);
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.');
    let count = 1;

    if (/all/i.test(command) || (args[0] && /all/i.test(args[0]))) {
        count = Math.floor(user.exp / xpperlimit);
    } else {
        count = parseInt(args[0]) || parseInt(command.replace(/^buy/i, "")) || 1;
    }

    count = Math.max(1, count);
    const totalCost = xpperlimit * count;
    if (user.exp < totalCost) return m.reply(`⚠️ Lo siento, no tienes suficientes *XP* para comprar *${count}* Diamantes 💎`);
    await exchangeWalletResources({userId: m.sender, from: 'exp', to: 'limite', fromAmount: totalCost, toAmount: count});
    await m.reply(`╔═❖ *ＮＯＴＡ ＤＥ ＰＡＧＯ*\n║‣ *Has comprado:* ${count} 💎\n║‣ *Gastado:* ${totalCost} XP\n╚═══════════════`);
    }
});

;
