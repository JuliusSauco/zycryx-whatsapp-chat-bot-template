import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationMinutesSeconds} from '../../utils/time.js';

export default defineSdkPlugin({
    help: ['work', 'trabajar', 'w'],
    tags: ['econ'],
    command: /^(work|trabajar|chambear|w|chamba)$/i,
    register: true,
    async execute(m, {sdk}) {
    const cooldown = 600_000; //10 min
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return sdk.reply.message('rpg.shared.missingUser');
    const lastWork = Number(user?.lastwork) || 0;
    const remaining = Math.max(0, lastWork + cooldown - now);

    if (remaining > 0) return sdk.reply.message('rpg.work.cooldown', {
        time: formatDurationMinutesSeconds(remaining)
    });
    const xpGanado = randomInt(6500);
    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: xpGanado},
        fields: {lastwork: now},
    });
    await sdk.reply.message('rpg.work.result', {
        message: pickRandom(sdk.content.messageList('rpg.work.variants')),
        xp: formatThousandsDot(xpGanado)
    });
    }
});

;
