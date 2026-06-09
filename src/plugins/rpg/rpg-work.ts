import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, getRequiredPluginMessageList, renderTemplate} from '../../lib/message-template.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationMinutesSeconds} from '../../utils/time.js';

export default definePlugin({
    help: ['work', 'trabajar', 'w'],
    tags: ['econ'],
    command: /^(work|trabajar|chambear|w|chamba)$/i,
    register: true,
    async execute(m, {conn}) {
    const cooldown = 600_000; //10 min
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return conn.reply(m.chat, getRequiredPluginMessage('rpg.shared.missingUser'), m);
    const lastWork = Number(user?.lastwork) || 0;
    const remaining = Math.max(0, lastWork + cooldown - now);

    if (remaining > 0) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.work.cooldown'), {
        time: formatDurationMinutesSeconds(remaining)
    }), m);
    const xpGanado = randomInt(6500);
    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: xpGanado},
        fields: {lastwork: now},
    });
    await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.work.result'), {
        message: pickRandom(getRequiredPluginMessageList('rpg.work.variants')),
        xp: formatThousandsDot(xpGanado)
    }), m);
    }
});

;
