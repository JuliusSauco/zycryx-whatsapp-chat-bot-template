import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationMinutesSeconds} from '../../utils/time.js';

export default defineSdkPlugin({
    help: ['slut'],
    tags: ['rpg', 'hot'],
    command: /^slut$/i,
    register: true,
    async execute(m, {sdk}) {
    const cooldown = 600_000; // 10 min
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return sdk.reply.message('rpg.shared.missingUser');
    const lastSlut = Number(user?.lastslut) || 0;
    const remaining = Math.max(0, lastSlut + cooldown - now);
    if (remaining > 0) return sdk.reply.message('rpg.slut.cooldown', {
        time: formatDurationMinutesSeconds(remaining)
    });

    const ganancias = randomInt(1000, 3499);
    const textoo = pickRandom(sdk.content.messageList('rpg.slut.variants'));
    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: ganancias},
        fields: {lastslut: now},
    });
    await sdk.reply.message('rpg.slut.result', {
        message: textoo,
        xp: formatThousandsDot(ganancias)
    });
    }
});


;
