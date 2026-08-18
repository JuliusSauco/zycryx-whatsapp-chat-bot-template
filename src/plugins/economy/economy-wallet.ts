import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import type {UserWallet} from '../../domain/users.js';
import type {BankOverview} from '../../domain/bank.js';
import {getBankOverview} from '../../services/bank.service.js';
import {getWallet} from '../../services/wallet.service.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';

export const WALLET_COMMANDS = ['wallet', 'ewallet', 'balance', 'bal', 'diamantes', 'diamond'] as const;

export function buildWalletMessage(user: UserWallet, sender: string, prefix: string, isGroup: boolean, bank?: BankOverview) {
    const publicValues = {user: sender.split('@')[0], level: user.level, exp: user.exp, diamonds: user.limite};
    if (isGroup) return {key: 'economy.wallet.public', values: publicValues} as const;

    const bankBalances = bank?.balances ?? {limite: 0, coins: 0, botcoin: 0, zyxcoin: 0};
    const loan = bank?.loan;
    const loanBlock = loan
        ? `\n\n╭─「 📄 *PRÉSTAMO* 」\n├ 📌 *Estado:* ${loan.status}\n├ 🧾 *Deuda:* ${loan.principalOutstanding + loan.interestOutstanding} Coins\n╰ 📅 *Vence:* ${loan.dueAt.toISOString().slice(0, 10)}`
        : '\n\n✅ _Sin préstamos pendientes._';
    return {
        key: 'economy.wallet.private',
        values: {
            ...publicValues,
            coins: user.coins,
            botcoin: user.botcoin,
            zyxcoin: user.zyxcoin,
            bankLimit: bankBalances.limite,
            bankCoins: bankBalances.coins,
            bankBotcoin: bankBalances.botcoin,
            bankZyxcoin: bankBalances.zyxcoin,
            loanBlock,
            prefix,
        },
    } as const;
}

export default defineSdkPlugin({
    help: ['wallet', 'wallet --info'],
    tags: ['economy'],
    feature: 'rpg',
    command: [...WALLET_COMMANDS],
    register: true,
    private: true,
    async execute(m, {args, isGroup, usedPrefix, sdk}) {
        if (isEconomyInfoRequest(args)) return sdk.reply.message('economy.wallet.guide', {prefix: usedPrefix});
        const user = await getWallet(m.sender);
        if (!user) return sdk.reply.message('rpg.shared.missingUser');
        const bank = isGroup ? undefined : await getBankOverview(m.sender);
        const message = buildWalletMessage(user, m.sender, usedPrefix, isGroup, bank);
        await sdk.reply.message(message.key, message.values, null, {mentions: [m.sender]});
    },
});
