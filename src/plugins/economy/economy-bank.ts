import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {getBankOverview} from '../../services/bank.service.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';

export default defineSdkPlugin({
    help: ['bank', 'bank --info'],
    tags: ['economy'],
    feature: 'rpg',
    command: ['bank'],
    register: true,
    private: true,
    async execute(m, {args, usedPrefix, sdk}) {
        if (isEconomyInfoRequest(args)) return sdk.reply.message('economy.bank.guide', {prefix: usedPrefix});
        const overview = await getBankOverview(m.sender);
        const loan = overview.loan;
        const loanSummary = loan
            ? sdk.content.renderMessage('economy.bank.loanSummary', {
                status: loan.status,
                debt: loan.principalOutstanding + loan.interestOutstanding,
                dueAt: loan.dueAt.toISOString().slice(0, 10),
            })
            : sdk.content.message('economy.bank.noLoan');
        return sdk.reply.message('economy.bank.status', {...overview.balances, loanSummary, prefix: usedPrefix});
    },
});
