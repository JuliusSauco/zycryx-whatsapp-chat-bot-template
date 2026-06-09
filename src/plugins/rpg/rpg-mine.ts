import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, getRequiredPluginMessageList, renderTemplate} from '../../lib/message-template.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationMinuteSecondsParen} from '../../utils/time.js';

export default definePlugin({
    help: ['minar'],
    tags: ['econ'],
    command: ['minar', 'miming', 'mine'],
    register: true,
    async execute(m) {
    const now = Date.now();
    const cooldown = 600_000; //10 min
    const hasil = randomInt(6000);
    const user = await getWallet(m.sender);
    if (!user) return m.reply(getRequiredPluginMessage('rpg.shared.missingUser'));
    const lastMine = Number(user?.lastmiming) || 0;
    const nextMineTime = lastMine + cooldown;
    const restante = Math.max(0, nextMineTime - now);
    if (restante > 0) return m.reply(renderTemplate(getRequiredPluginMessage('rpg.mine.cooldown'), {
        time: formatDurationMinuteSecondsParen(restante)
    }));
    const minar = pickRandom(getRequiredPluginMessageList('rpg.mine.variants'));

    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: hasil},
        fields: {lastmiming: now},
    });
    m.reply(renderTemplate(getRequiredPluginMessage('rpg.mine.result'), {
        message: minar,
        xp: formatThousandsDot(hasil)
    }));
    }
});

;

