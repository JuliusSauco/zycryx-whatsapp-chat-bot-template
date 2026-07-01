import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {exchangeWalletResources, getWallet} from '../../services/wallet.service.js';

const xpperlimit = 750;

export default defineSdkPlugin({
    help: ['buy [cantidad]', 'buyall', 'buy all'],
    tags: ['econ'],
    command: /^buy(all)?$/i,
    register: true,
    async execute(m, {command, args, sdk}) {
    let user = await getWallet(m.sender);
    if (!user) return sdk.reply.message('rpg.shared.missingUser');
    let count = 1;

    if (/all/i.test(command) || (args[0] && /all/i.test(args[0]))) {
        count = Math.floor(user.exp / xpperlimit);
    } else {
        count = parseInt(args[0]) || parseInt(command.replace(/^buy/i, "")) || 1;
    }

    count = Math.max(1, count);
    const totalCost = xpperlimit * count;
    if (user.exp < totalCost) return sdk.reply.message('rpg.shop.notEnoughExp', {count});
    await exchangeWalletResources({userId: m.sender, from: 'exp', to: 'limite', fromAmount: totalCost, toAmount: count});
    await sdk.reply.message('rpg.shop.receipt', {
        count,
        cost: totalCost
    });
    }
});

;
