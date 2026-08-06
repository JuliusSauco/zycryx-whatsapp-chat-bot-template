import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {getLoanCreditLimit, MIN_LOAN_LEVEL} from '../../domain/bank.js';
import {getBankOverview, payBankLoan, requestBankLoan} from '../../services/bank.service.js';
import {getWallet} from '../../services/wallet.service.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';

export default defineSdkPlugin({
    help: ['loan', 'loan --info', 'loan request <cantidad>', 'loan pay <cantidad|all>'],
    tags: ['economy'],
    feature: 'rpg',
    command: ['loan'],
    register: true,
    private: true,
    async execute(m, {args, usedPrefix, sdk}) {
        if (isEconomyInfoRequest(args)) return sdk.reply.message('economy.loan.guide', {prefix: usedPrefix});
        const action = args[0]?.toLowerCase() ?? 'info';
        if (action === 'info') {
            const [overview, wallet] = await Promise.all([getBankOverview(m.sender), getWallet(m.sender)]);
            const loan = overview.loan;
            if (!loan) return sdk.reply.message('economy.loan.none', {
                creditLimit: getLoanCreditLimit(wallet?.level ?? 0), minimumLevel: MIN_LOAN_LEVEL, prefix: usedPrefix,
            });
            return sdk.reply.message('economy.loan.info', {
                status: loan.status,
                principal: loan.principal,
                interest: loan.interestAmount,
                principalOutstanding: loan.principalOutstanding,
                interestOutstanding: loan.interestOutstanding,
                total: loan.principalOutstanding + loan.interestOutstanding,
                dueAt: loan.dueAt.toISOString().slice(0, 10),
                defaultAt: loan.defaultAt.toISOString().slice(0, 10),
                prefix: usedPrefix,
            });
        }
        if (action === 'request') {
            const result = await requestBankLoan(m.sender, Number(args[1]));
            if (result.kind === 'success') return sdk.reply.message('economy.loan.approved', {
                principal: result.loan.principal,
                interest: result.loan.interestAmount,
                total: result.loan.principal + result.loan.interestAmount,
                dueAt: result.loan.dueAt.toISOString().slice(0, 10),
            });
            const keyByKind = {
                not_registered: 'economy.loan.notRegistered',
                existing_loan: 'economy.loan.existing',
                insufficient_reserve: 'economy.loan.noReserve',
                level_too_low: 'economy.loan.lowLevel',
                invalid_amount: 'economy.loan.invalidAmount',
                over_credit_limit: 'economy.loan.overLimit',
            } as const;
            return sdk.reply.message(keyByKind[result.kind], result);
        }
        if (action === 'pay') {
            const raw = args[1]?.toLowerCase();
            const amount = raw === 'all' ? 'all' : Number(raw);
            if (amount !== 'all' && (!Number.isInteger(amount) || amount <= 0)) {
                return sdk.reply.message('economy.loan.usage', {prefix: usedPrefix});
            }
            const result = await payBankLoan(m.sender, amount);
            if (result.kind === 'no_loan') return sdk.reply.message('economy.loan.noDebt');
            if (result.kind !== 'success') return sdk.reply.message('economy.loan.notEnoughCoins');
            return sdk.reply.message('economy.loan.paid', {
                amount: result.amount,
                interestPaid: result.interestPaid,
                principalPaid: result.principalPaid,
                remaining: result.loan.interestOutstanding + result.loan.principalOutstanding,
                status: result.loan.status,
            });
        }
        return sdk.reply.message('economy.loan.usage', {prefix: usedPrefix});
    },
});
