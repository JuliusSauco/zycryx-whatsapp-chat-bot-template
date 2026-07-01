import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {randomInt} from '../../utils/random.js';
import {formatDurationHoursMinutes} from '../../utils/time.js';

export default defineSdkPlugin({
    help: ['cofre', 'coffer', 'abrircofre'],
    tags: ['econ'],
    command: ['coffer', 'cofre', 'abrircofre', 'cofreabrir'],
    register: true,
    level: 9,
    async execute(m, {conn, sdk}) {
    const cooldown = 122_400_000; // 3 días
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return sdk.reply.message('rpg.shared.missingUser');
    const lastCofre = Number(user?.lastcofre) || 0;
    const nextTime = lastCofre + cooldown;
    const restante = Math.max(0, nextTime - now);
    if (restante > 0) return sdk.reply.message('rpg.cofre.cooldown', {
        time: formatDurationHoursMinutes(restante)
    });

    const img = sdk.content.message('rpg.cofre.image');
    const diamantes = randomInt(30);
    const coins = randomInt(4000);
    const xp = randomInt(5000);

    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: xp, money: coins, limite: diamantes},
        fields: {lastcofre: now},
    });

    const texto = sdk.content.renderMessage('rpg.cofre.caption', {
        diamonds: diamantes,
        coins,
        xp
    });

    await conn.sendMessage(m.chat, {image: {url: img}, caption: texto}, {
        quoted: {
            key: {
                fromMe: false,
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast'
            },
            message: {
                conversation: sdk.content.message('rpg.cofre.quoted')
            }
        }
    });
    }
});

;

