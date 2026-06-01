import {definePlugin} from '../../core/define-plugin.js'
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';

export default definePlugin({
    help: ['minar'],
    tags: ['econ'],
    command: ['minar', 'miming', 'mine'],
    register: true,
    async execute(m, {conn}) {
    const now = Date.now();
    const cooldown = 600_000; //10 min
    const hasil = Math.floor(Math.random() * 6000);
    const user = await getWallet(m.sender);
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.');
    const lastMine = Number(user?.lastmiming) || 0;
    const nextMineTime = lastMine + cooldown;
    const restante = Math.max(0, nextMineTime - now);
    if (restante > 0) return m.reply(`⏳ 𝐄𝐬𝐩𝐞𝐫𝐚 *${msToTime(restante)}* 𝐩𝐚𝐫𝐚 𝐯𝐨𝐥𝐯𝐞𝐫 𝐚 𝐦𝐢𝐧𝐚𝐫`);
    const minar = pickRandom(['Que pro 😎 has minado', '🌟✨ Genial!! Obtienes', 'WOW!! eres un(a) gran Minero(a) ⛏️ Obtienes', 'Has Minado!!', '😲 Lograste Minar la cantidad de', 'Tus Ingresos subiran gracias a que minaste', '⛏️⛏️⛏️⛏️⛏️ Minando', '🤩 SII!!! AHORA TIENES', 'La minaria esta de tu lado, por ello obtienes', '😻 La suerte de Minar', '♻️ Tu Mision se ha cumplido, lograste minar', '⛏️ La Mineria te ha beneficiado con', '🛣️ Has encontrado un Lugar y por minar dicho lugar Obtienes', '👾 Gracias a que has minado tus ingresos suman', 'Felicidades!! Ahora tienes', '⛏️⛏️⛏️ Obtienes']);

    await addWalletResourcesAndSetFields({
        userId: m.sender,
        resources: {exp: hasil},
        fields: {lastmiming: now},
    });
    m.reply(`${minar} *${formatNumber(hasil)} XP*`);
    }
});

;

function pickRandom<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
}

function msToTime(duration: number) {
    const totalSeconds = Math.floor(Math.max(0, duration) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} minuto(s) ${seconds} segundo(s)`;
}

function formatNumber(num: number) {
    return num.toLocaleString('en').replace(/,/g, '.');
}
