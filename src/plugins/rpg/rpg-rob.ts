import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {addWalletResourcesAndSetFields, getWallet, transferWalletResource} from '../../services/wallet.service.js';
import {formatDurationClockWords} from '../../utils/time.js';

const ROB_EXP_AMOUNT = 3000;
const ROB_COOLDOWN_MS = 25 * 60 * 1000; // 25 minutos

export default defineSdkPlugin({
    help: ['rob', 'robar'],
    tags: ['econ'],
    command: /^(robar|rob)$/i,
    register: true,
    async execute(m, {conn, sdk}) {
    const now = Date.now();
    const robber = await getWallet(m.sender);
    if (!robber) return sdk.reply.message('rpg.rob.missingUser');
    const timeLeft = (robber.lastrob ?? 0) + ROB_COOLDOWN_MS - now;
    if (timeLeft > 0) return sdk.reply.message('rpg.rob.cooldown', {
        time: formatDurationClockWords(timeLeft)
    });

    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted?.sender;
    } else {
        who = m.chat;
    }

    if (!who) return sdk.reply.message('rpg.rob.missingTarget');
    if (who === m.sender) return sdk.reply.message('rpg.rob.selfTarget');
    const victim = await getWallet(who);
    if (!victim) return sdk.reply.message('rpg.rob.missingVictim');

    if ((victim.exp ?? 0) < ROB_EXP_AMOUNT) return conn.reply(m.chat, sdk.content.renderMessage('rpg.rob.poorVictim', {
        user: who.split('@')[0],
        minimum: ROB_EXP_AMOUNT
    }), m, {mentions: [who]});
    const transferred = await transferWalletResource({from: who, to: m.sender, resource: 'exp', amount: ROB_EXP_AMOUNT});
    if (!transferred) return sdk.reply.message('rpg.rob.transferFailed');
    await addWalletResourcesAndSetFields({userId: m.sender, resources: {}, fields: {lastrob: now}});
    return conn.reply(m.chat, sdk.content.renderMessage('rpg.rob.success', {
        amount: ROB_EXP_AMOUNT,
        user: who.split('@')[0]
    }), m, {mentions: [who]});
    }
});

;

