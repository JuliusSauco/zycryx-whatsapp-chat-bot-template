import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {exchangeWalletResources, getWallet} from '../../services/wallet.service.js';

const xpperlimit = 750;

export default definePlugin({
    help: ['buy [cantidad]', 'buyall', 'buy all'],
    tags: ['econ'],
    command: /^buy(all)?$/i,
    register: true,
    async execute(m, {command, args}) {
    let user = await getWallet(m.sender);
    if (!user) return m.reply(getRequiredPluginMessage('rpg.shared.missingUser'));
    let count = 1;

    if (/all/i.test(command) || (args[0] && /all/i.test(args[0]))) {
        count = Math.floor(user.exp / xpperlimit);
    } else {
        count = parseInt(args[0]) || parseInt(command.replace(/^buy/i, "")) || 1;
    }

    count = Math.max(1, count);
    const totalCost = xpperlimit * count;
    if (user.exp < totalCost) return m.reply(renderTemplate(getRequiredPluginMessage('rpg.shop.notEnoughExp'), {count}));
    await exchangeWalletResources({userId: m.sender, from: 'exp', to: 'limite', fromAmount: totalCost, toAmount: count});
    await m.reply(renderTemplate(getRequiredPluginMessage('rpg.shop.receipt'), {
        count,
        cost: totalCost
    }));
    }
});

;
