import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {isBankResource} from '../../domain/bank.js';
import {adjustBankReserve, getBankReserves} from '../../services/bank.service.js';

export default defineSdkPlugin({
    help: ['bankreserve status', 'bankreserve add <recurso> <cantidad>', 'bankreserve remove <recurso> <cantidad>'],
    tags: ['owner'],
    command: ['bankreserve'],
    owner: true,
    private: true,
    async execute(m, {args, usedPrefix, sdk}) {
        const action = args[0]?.toLowerCase();
        if (!action || action === 'status') {
            const reserves = await getBankReserves();
            return sdk.reply.message('economy.bankReserve.status', {...reserves});
        }
        const resource = args[1]?.toLowerCase() ?? '';
        const amount = Number(args[2]);
        if (!['add', 'remove'].includes(action) || !isBankResource(resource) || !Number.isSafeInteger(amount) || amount <= 0) {
            return sdk.reply.message('economy.bankReserve.usage', {prefix: usedPrefix});
        }
        const signedAmount = action === 'add' ? amount : -amount;
        const balance = await adjustBankReserve(m.sender, resource, signedAmount);
        if (balance === null) return sdk.reply.message('economy.bankReserve.insufficient');
        return sdk.reply.message('economy.bankReserve.updated', {resource, amount: signedAmount, balance});
    },
});
