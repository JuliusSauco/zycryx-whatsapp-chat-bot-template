import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {exchangeBankCurrency, listBankExchangeRates} from '../../services/bank.service.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';
import {deliverPrivateReceipt} from '../store/store-receipt.helpers.js';

export default defineSdkPlugin({
    help: ['buy [cantidad]', 'buy --info', 'buyall', 'buy all'],
    tags: ['economy'],
    feature: 'rpg',
    command: /^buy(all)?$/i,
    register: true,
    async execute(m, context) {
        const {command, args, usedPrefix, sdk} = context;
        if (isEconomyInfoRequest(args)) {
            const rates = await listBankExchangeRates();
            const rate = rates.find(item => item.sourceResource === 'exp' && item.targetResource === 'limite');
            return sdk.reply.message('economy.buy.guide', {
                prefix: usedPrefix,
                sourceAmount: rate?.sourceAmount ?? 1_000,
                targetAmount: rate?.targetAmount ?? 1,
            });
        }
        const buyAll = /all/i.test(command) || args[0]?.toLowerCase() === 'all';
        const requested = buyAll ? 'all' : (args[0] === undefined ? 1 : Number(args[0]));
        if (requested !== 'all' && (!Number.isSafeInteger(requested) || requested <= 0)) {
            return sdk.reply.message('economy.buy.usage', {prefix: usedPrefix});
        }
        const result = await exchangeBankCurrency({
            userId: m.sender, sourceResource: 'exp', targetResource: 'limite', amount: requested,
        });
        if (result.kind === 'insufficient_wallet') return sdk.reply.message('economy.buy.notEnoughExp');
        if (result.kind === 'insufficient_reserve') return sdk.reply.message('economy.exchange.insufficientReserve');
        if (result.kind !== 'success') return sdk.reply.message('economy.exchange.failed');
        const receipt = sdk.content.renderMessage('economy.buy.receipt', {
            count: result.targetReceived,
            cost: result.sourceSpent,
            expBalance: result.sourceBalance,
            limitBalance: result.targetBalance,
        });
        return deliverPrivateReceipt(m, context, receipt, 'economy.shared');
    },
});
