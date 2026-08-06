import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {transferBankCustody} from '../../services/bank.service.js';
import {parseCustodyArguments} from './economy-custody.helpers.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';

export const WITHDRAW_COMMANDS = ['withdraw', 'retirar', 'toremove'] as const;

export default defineSdkPlugin({
    help: ['withdraw <recurso> <cantidad|all>', 'withdraw --info'],
    tags: ['economy'],
    feature: 'rpg',
    command: [...WITHDRAW_COMMANDS],
    register: true,
    private: true,
    async execute(m, {args, usedPrefix, command, sdk}) {
        if (isEconomyInfoRequest(args)) return sdk.reply.message('economy.withdraw.guide', {prefix: usedPrefix});
        const parsed = parseCustodyArguments(args);
        if (!parsed) return sdk.reply.message('economy.bank.usage', {prefix: usedPrefix, command});
        const result = await transferBankCustody({userId: m.sender, ...parsed, direction: 'withdraw'});
        if (result.kind === 'insufficient_bank') return sdk.reply.message('economy.bank.notEnoughBank');
        if (result.kind !== 'success') return sdk.reply.message('economy.bank.operationFailed');
        return sdk.reply.message('economy.bank.withdraw', {
            amount: result.amount,
            resource: parsed.resource,
            walletBalance: result.walletBalance,
            bankBalance: result.bankBalance,
        });
    },
});
