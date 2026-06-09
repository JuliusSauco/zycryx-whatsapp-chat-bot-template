import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, getRequiredPluginMessageList, renderTemplate} from '../../lib/message-template.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationMinutesSeconds} from '../../utils/time.js';

export default definePlugin({
    help: ['slut'],
    tags: ['rpg', 'hot'],
    command: /^slut$/i,
    register: true,
    async execute(m, {conn}) {
    const cooldown = 600_000; // 10 min
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return conn.reply(m.chat, getRequiredPluginMessage('rpg.shared.missingUser'), m);
    const lastSlut = Number(user?.lastslut) || 0;
    const remaining = Math.max(0, lastSlut + cooldown - now);
    if (remaining > 0) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.slut.cooldown'), {
        time: formatDurationMinutesSeconds(remaining)
    }), m);

    const ganancias = randomInt(1000, 3499);
    const textoo = pickRandom(getRequiredPluginMessageList('rpg.slut.variants'));
    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: ganancias},
        fields: {lastslut: now},
    });
    await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.slut.result'), {
        message: textoo,
        xp: formatThousandsDot(ganancias)
    }), m);
    }
});


;
