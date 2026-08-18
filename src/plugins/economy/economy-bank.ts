import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {getBankOverview} from '../../services/bank.service.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';

export const BANK_COMMANDS = ['bank', 'banco'] as const;

export default defineSdkPlugin({
    help: ['bank', 'banco', 'bank --info'],
    tags: ['economy'],
    feature: 'rpg',
    command: [...BANK_COMMANDS],
    register: true,
    async execute(m, {args, usedPrefix, sdk, conn}) {
        if (m.isGroup) {
            const guide = sdk.content.renderMessage('economy.bank.guide', {prefix: usedPrefix});
            const user = m.sender.split('@')[0];
            try {
                await conn.sendMessage(m.sender, {text: guide});
                return conn.reply(m.chat, sdk.content.renderMessage('economy.bank.groupGuideSent', {user}), m, {
                    mentions: [m.sender],
                });
            } catch {
                return conn.reply(m.chat, sdk.content.renderMessage('economy.bank.groupGuideFailed', {user}), m, {
                    mentions: [m.sender],
                });
            }
        }
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
