import {definePlugin} from '../../core/define-plugin.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatShortThousands, formatThousandsDot} from '../../utils/format.js';
import {formatDurationHoursMinutesShort} from '../../utils/time.js';

const free = 5000;
const expIncrease = 1000;
const bonusExp = 10000;
const bonusLimit = 10;
const bonusMoney = 5000;

export default definePlugin({
    command: ['daily', 'claim'],
    help: ['daily', 'claim'],
    tags: ['econ'],
    register: true,
    async execute(m, {conn}) {
        const now = Date.now();
        const user = await getWallet(m.sender);
        if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.');
        const lastClaim = Number(user.lastclaim) || 0;
        const streak = Number(user.dailystreak) || 0;
        const nextClaimTime = lastClaim + 86400000;
        const restante = Math.max(0, nextClaimTime - now);

        if (now - lastClaim < 86400000) return m.reply(`⚠️ Ya reclamaste tu recompensa diaria, vuelve en *${formatDurationHoursMinutesShort(restante)}* para reclamar de nuevo 🎁.`);

        const newStreak = (now - lastClaim < 172800000) ? streak + 1 : 1;
        const currentExp = free + (newStreak - 1) * expIncrease;
        const nextExp = currentExp + expIncrease;

        let bonusText = "";
        if (newStreak % 7 === 0) {
            await addWalletResourcesAndSetFields({
                userId: m.sender,
                resources: {exp: currentExp + bonusExp, limite: bonusLimit, money: bonusMoney},
                fields: {lastclaim: now, dailystreak: newStreak},
            });

            bonusText = `\n\n🎉 *¡BONUS por 7 días de racha!* 🎉\n> +${formatThousandsDot(bonusExp)} XP extra\n> +${bonusLimit} Diamantes 💎\n> +${formatThousandsDot(bonusMoney)} LoliCoins 🪙\n\n`;
        } else {
            await addWalletResourcesAndSetFields({
                userId: m.sender,
                resources: {exp: currentExp},
                fields: {lastclaim: now, dailystreak: newStreak},
            });
        }

        await conn.fakeReply(m.chat, `*🔸 𝐇𝐀𝐒 𝐑𝐄𝐂𝐈𝐁𝐈𝐃𝐎:* Tu recompensa diaria de: *${formatThousandsDot(currentExp)} XP* (Día  ${newStreak})\n` + bonusText + `> _*Mañana no te olviden de seguir reclamado tu recompensa ganaras: ${formatShortThousands(nextExp)} (${formatThousandsDot(nextExp)}) XP*_\n`, '13135550002@s.whatsapp.net', `🎁 Obtener un regalo 🎁`, 'status@broadcast');
    }
});
