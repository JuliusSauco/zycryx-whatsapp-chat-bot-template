import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatShortThousands, formatThousandsDot} from '../../utils/format.js';
import {formatDurationHoursMinutesShort} from '../../utils/time.js';
import {calculateDailyReward} from '../../domain/daily-rewards.js';

export default defineSdkPlugin({
    command: ['daily', 'claim'],
    help: ['daily', 'claim'],
    tags: ['rpg'],
    register: true,
    async execute(m, {conn, sdk}) {
        const now = Date.now();
        const user = await getWallet(m.sender);
        if (!user) return sdk.reply.message('rpg.shared.missingUser');
        const lastClaim = Number(user.lastclaim) || 0;
        const streak = Number(user.dailystreak) || 0;
        const nextClaimTime = lastClaim + 86400000;
        const restante = Math.max(0, nextClaimTime - now);

        if (now - lastClaim < 86400000) return sdk.reply.message('rpg.daily.alreadyClaimed', {
            time: formatDurationHoursMinutesShort(restante)
        });

        const newStreak = (now - lastClaim < 172800000) ? streak + 1 : 1;
        const reward = calculateDailyReward(newStreak);
        const currentExp = reward.baseExp;
        const nextExp = reward.nextBaseExp;

        let bonusText = "";
        if (reward.hasBonus) {
            await addWalletResourcesAndSetFields({
                userId: m.sender,
                resources: {exp: currentExp + reward.bonusExp, limite: reward.limits, coins: reward.coins},
                fields: {lastclaim: now, dailystreak: newStreak},
                reason: 'daily_reward',
                operation: 'daily',
            });

            bonusText = sdk.content.renderMessage('rpg.daily.bonus', {
                bonusExp: formatThousandsDot(reward.bonusExp),
                bonusLimit: reward.limits,
                bonusCoins: formatThousandsDot(reward.coins)
            });
        } else {
            await addWalletResourcesAndSetFields({
                userId: m.sender,
                resources: {exp: currentExp},
                fields: {lastclaim: now, dailystreak: newStreak},
                reason: 'daily_reward',
                operation: 'daily',
            });
        }

        await conn.fakeReply(m.chat, sdk.content.renderMessage('rpg.daily.reward', {
            currentExp: formatThousandsDot(currentExp),
            streak: newStreak,
            bonusText,
            nextExpShort: formatShortThousands(nextExp),
            nextExp: formatThousandsDot(nextExp)
        }), '13135550002@s.whatsapp.net', sdk.content.message('rpg.daily.quoted'), 'status@broadcast');
    }
});
