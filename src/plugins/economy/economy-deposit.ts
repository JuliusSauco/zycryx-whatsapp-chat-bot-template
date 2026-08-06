import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {transferBankCustody} from '../../services/bank.service.js';
import {parseCustodyArguments} from './economy-custody.helpers.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';

export const DEPOSIT_COMMANDS = ['deposit', 'dep', 'depositar'] as const;

export default defineSdkPlugin({
    help: ['deposit <recurso> <cantidad|all>', 'deposit --info'],
    tags: ['economy'],
    feature: 'rpg',
    command: [...DEPOSIT_COMMANDS],
    register: true,
    private: true,
    async execute(m, {args, usedPrefix, command, sdk}) {
        if (isEconomyInfoRequest(args)) return sdk.reply.message('economy.deposit.guide', {prefix: usedPrefix});
        const parsed = parseCustodyArguments(args);
        if (!parsed) return sdk.reply.message('economy.bank.usage', {prefix: usedPrefix, command});
        const result = await transferBankCustody({userId: m.sender, ...parsed, direction: 'deposit'});
        if (result.kind === 'insufficient_wallet') return sdk.reply.message('economy.bank.notEnoughWallet');
        if (result.kind !== 'success') return sdk.reply.message('economy.bank.operationFailed');
        return sdk.reply.message('economy.bank.deposit', {
            amount: result.amount,
            resource: parsed.resource,
            walletBalance: result.walletBalance,
            bankBalance: result.bankBalance,
        });
    },
});
