import {definePlugin} from '../core/define-plugin.js'
import {addWalletResourcesAndSetFields, getWallet} from '../services/wallet.service.js';

export default definePlugin({
    help: ['cofre', 'coffer', 'abrircofre'],
    tags: ['econ'],
    command: ['coffer', 'cofre', 'abrircofre', 'cofreabrir'],
    register: true,
    level: 9,
    async execute(m, {conn}) {
    const cooldown = 122_400_000; // 3 días
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.');
    const lastCofre = Number(user?.lastcofre) || 0;
    const nextTime = lastCofre + cooldown;
    const restante = Math.max(0, nextTime - now);
    if (restante > 0) return m.reply(`🕛 𝐘𝐚 𝐫𝐞𝐜𝐥𝐚𝐦𝐚𝐬𝐭𝐞 𝐭𝐮 𝐜𝐨𝐟𝐫𝐞 🎁\n𝐕𝐮𝐞𝐥𝐯𝐞 𝐞𝐧 *${msToTime(restante)}* 𝐩𝐚𝐫𝐚 𝐫𝐞𝐜𝐥𝐚𝐦𝐚𝐫 𝐧𝐮𝐞𝐯𝐚𝐦𝐞𝐧𝐭𝐞`);

    const img = 'https://img.freepik.com/vector-gratis/cofre-monedas-oro-piedras-preciosas-cristales-trofeo_107791-7769.jpg?w=2000';
    const diamantes = Math.floor(Math.random() * 30);
    const coins = Math.floor(Math.random() * 4000);
    const xp = Math.floor(Math.random() * 5000);

    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: xp, money: coins, limite: diamantes},
        fields: {lastcofre: now},
    });

    const texto = `[ 🛒 𝐎𝐁𝐓𝐈𝐄𝐍𝐄𝐒 𝐔𝐍 𝐂𝐎𝐅𝐑𝐄 🎉 ]

* ${diamantes} 𝐃𝐢𝐚𝐦𝐚𝐧𝐭𝐞𝐬 💎
* ${coins} 𝐂𝐨𝐢𝐧𝐬 🪙
* ${xp} 𝐄𝐱𝐩 ⚡`;

    await conn.sendMessage(m.chat, {image: {url: img}, caption: texto}, {
        quoted: {
            key: {
                fromMe: false,
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast'
            },
            message: {
                conversation: '🎉 Obtiene un regalo 🎁'
            }
        }
    });
    }
});

;

// Helpers

function msToTime(duration: any) {
    const totalMinutes = Math.floor(duration / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} Horas ${minutes} Minutos`;
}
