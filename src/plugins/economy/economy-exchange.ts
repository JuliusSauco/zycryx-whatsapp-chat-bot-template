import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {isBankResource} from '../../domain/bank.js';
import {exchangeBankCurrency, listBankExchangeRates} from '../../services/bank.service.js';
import {isWalletResource} from '../../services/wallet.service.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';
import type {BankExchangeRate} from '../../domain/bank.js';

function resourceLabel(resource: string): string {
    const labels: Record<string, string> = {
        exp: '✨ EXP', limite: '💎 Límite', coins: '🪙 Coins', botcoin: '🤖 Botcoin', zyxcoin: '🔷 Zyxcoin',
    };
    return labels[resource] ?? resource;
}

function renderRates(rates: BankExchangeRate[], render: (key: string, values: Record<string, string | number>) => string): string {
    return rates.map(rate => render('economy.exchange.rate', {
        sourceAmount: rate.sourceAmount,
        source: resourceLabel(rate.sourceResource),
        targetAmount: rate.targetAmount,
        target: resourceLabel(rate.targetResource),
    })).join('\n');
}

export default defineSdkPlugin({
    help: ['exchange --info', 'exchange info', 'exchange <origen> <destino> <cantidad|all>'],
    tags: ['economy'],
    feature: 'rpg',
    command: ['exchange'],
    register: true,
    private: true,
    async execute(m, {args, usedPrefix, sdk}) {
        if (isEconomyInfoRequest(args)) {
            const rates = await listBankExchangeRates();
            const rows = renderRates(rates, (key, values) => sdk.content.renderMessage(key, values));
            return sdk.reply.message('economy.exchange.guide', {rates: rows, prefix: usedPrefix});
        }
        if (args[0]?.toLowerCase() === 'info') {
            const rates = await listBankExchangeRates();
            const rows = renderRates(rates, (key, values) => sdk.content.renderMessage(key, values));
            return sdk.reply.message('economy.exchange.info', {rates: rows, prefix: usedPrefix});
        }
        const source = args[0]?.toLowerCase() ?? '';
        const target = args[1]?.toLowerCase() ?? '';
        const rawAmount = args[2]?.toLowerCase();
        if (!isWalletResource(source) || !isBankResource(target) || !rawAmount) {
            return sdk.reply.message('economy.exchange.usage', {prefix: usedPrefix});
        }
        const amount = rawAmount === 'all' ? 'all' : Number(rawAmount);
        if (amount !== 'all' && (!Number.isSafeInteger(amount) || amount <= 0)) {
            return sdk.reply.message('economy.exchange.invalidAmount');
        }
        const result = await exchangeBankCurrency({
            userId: m.sender, sourceResource: source, targetResource: target, amount,
        });
        if (result.kind === 'unavailable_pair') return sdk.reply.message('economy.exchange.unavailablePair');
        if (result.kind === 'invalid_amount') return sdk.reply.message('economy.exchange.invalidAmount');
        if (result.kind === 'insufficient_wallet') return sdk.reply.message('economy.exchange.insufficientWallet');
        if (result.kind === 'insufficient_reserve') return sdk.reply.message('economy.exchange.insufficientReserve');
        if (result.kind !== 'success') return sdk.reply.message('economy.exchange.failed');
        return sdk.reply.message('economy.exchange.receipt', {
            sourceSpent: result.sourceSpent,
            source: resourceLabel(result.rate.sourceResource),
            targetReceived: result.targetReceived,
            target: resourceLabel(result.rate.targetResource),
            sourceBalance: result.sourceBalance,
            targetBalance: result.targetBalance,
        });
    },
});
