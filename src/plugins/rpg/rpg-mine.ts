import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationMinuteSecondsParen} from '../../utils/time.js';

export default defineSdkPlugin({
    help: ['minar'],
    tags: ['econ'],
    command: ['minar', 'miming', 'mine'],
    register: true,
    async execute(m, {sdk}) {
    const now = Date.now();
    const cooldown = 600_000; //10 min
    const hasil = randomInt(6000);
    const user = await getWallet(m.sender);
    if (!user) return sdk.reply.message('rpg.shared.missingUser');
    const lastMine = Number(user?.lastmiming) || 0;
    const nextMineTime = lastMine + cooldown;
    const restante = Math.max(0, nextMineTime - now);
    if (restante > 0) return sdk.reply.message('rpg.mine.cooldown', {
        time: formatDurationMinuteSecondsParen(restante)
    });
    const minar = pickRandom(sdk.content.messageList('rpg.mine.variants'));

    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: hasil},
        fields: {lastmiming: now},
    });
    await sdk.reply.message('rpg.mine.result', {
        message: minar,
        xp: formatThousandsDot(hasil)
    });
    }
});

;

