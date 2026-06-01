import {definePlugin} from '../../core/define-plugin.js';
import {addWalletResourceAndSetWait, getWallet} from '../../services/wallet.service.js';

export default definePlugin({
    help: ['cf <cantidad>'],
    tags: ['game'],
    command: ['cf'],
    register: true,
    async execute(m, {conn, args}) {
    const bet = parseInt(args[0], 10);
    const cooldown = 30_000;
    const now = Date.now();
    if (!bet || bet <= 0) return m.reply('❌ Ingresa una cantidad válida para apostar.');
    const user = await getWallet(m.sender);
    if (!user || user.exp < bet) return m.reply(`❌ No tienes suficiente experiencia (exp) para esta apuesta. Solo tienes ${formatNumber(user?.exp || 0)} XP.`);

    const last = Number(user.wait) || 0;
    const remaining = last + cooldown - now;
    if (now - last < cooldown) return conn.fakeReply(m.chat, `*🕓 Calma crack 🤚, Espera ${msToTime(remaining)} antes de volver usar en comando*`, m.sender, `ᴺᵒ ʰᵃᵍᵃⁿ ˢᵖᵃᵐ`, 'status@broadcast');

    const outcome = Math.random() < 0.5 ? 'cara' : 'cruz';
    const win = outcome === 'cara';
    await addWalletResourceAndSetWait(m.sender, 'exp', win ? bet * 2 : -bet, now);
    return m.reply(`${win ? '🎉' : '💀'} La moneda cayó en *${outcome}* y ${win ? `ganaste *${formatNumber(bet * 2)}* XP.` : `perdiste *${formatNumber(bet)}* XP.`}`);
    }
});

function msToTime(duration: number) {
    let seconds = Math.floor((duration / 1000) % 60);
    const formattedSeconds = seconds < 10 ? '0' + seconds : String(seconds);
    return `${formattedSeconds} segundos `;
}

function formatNumber(num: number) {
    return num.toLocaleString('en').replace(/,/g, '.');
}
