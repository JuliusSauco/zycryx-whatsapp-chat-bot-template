import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {addWalletResourcesAndSetFields, getWallet, transferWalletResource} from '../../services/wallet.service.js';
import {randomInt} from '../../utils/random.js';
import {formatDurationClockWords} from '../../utils/time.js';

const ro = 3000;

export default definePlugin({
    help: ['rob', 'robar'],
    tags: ['econ'],
    command: /^(robar|rob)$/i,
    register: true,
    async execute(m, {conn}) {
    const now = Date.now();
    const robber = await getWallet(m.sender);
    if (!robber) return m.reply(getRequiredPluginMessage('rpg.rob.missingUser'));
    const cooldown = 3600000;
    const timeLeft = (robber.lastrob ?? 0) + cooldown - now;
    if (timeLeft > 0) return m.reply(renderTemplate(getRequiredPluginMessage('rpg.rob.cooldown'), {
        time: formatDurationClockWords(timeLeft)
    }));

    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted?.sender;
    } else {
        who = m.chat;
    }

    if (!who) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rob.missingTarget'), m);
    if (who === m.sender) return m.reply(getRequiredPluginMessage('rpg.rob.selfTarget'));
    const victim = await getWallet(who);
    if (!victim) return m.reply(getRequiredPluginMessage('rpg.rob.missingVictim'));

    const cantidad = randomInt(ro);
    if ((victim.exp ?? 0) < cantidad) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rob.poorVictim'), {
        user: who.split('@')[0],
        minimum: ro
    }), m, {mentions: [who]});
    const transferred = await transferWalletResource({from: who, to: m.sender, resource: 'exp', amount: cantidad});
    if (!transferred) return m.reply(getRequiredPluginMessage('rpg.rob.transferFailed'));
    await addWalletResourcesAndSetFields({userId: m.sender, resources: {}, fields: {lastrob: now}});
    return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rob.success'), {
        amount: cantidad,
        user: who.split('@')[0]
    }), m, {mentions: [who]});
    }
});

;

