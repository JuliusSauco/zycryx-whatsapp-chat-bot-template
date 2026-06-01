import {definePlugin} from '../../core/define-plugin.js';
import {addWalletResourceAndSetWait, getWallet, isWalletResource} from '../../services/wallet.service.js';

type SlotSymbol = string;
type SlotRow = [SlotSymbol, SlotSymbol, SlotSymbol];
type SlotMatrix = [SlotRow, SlotRow, SlotRow];

export default definePlugin({
    command: ['slot'],
    help: ['slot <xp|money|limite> <cantidad>'],
    tags: ['game'],
    register: true,
    async execute(m, {conn, args}) {
    const cooldown = 30_000;
    const now = Date.now();

    const user = await getWallet(m.sender);
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.');

    const last = Number(user?.wait) || 0;
    const remaining = last + cooldown - now;
    if (remaining > 0) return conn.reply(m.chat, `🕓 Calma crack, espera *${msToTime(remaining)}* antes de volver a jugar.`, m);

    const tipoArg = (args[0] || '').toLowerCase();
    const tipo = tipoArg === 'xp' ? 'exp' : tipoArg;
    const cantidad = parseInt(args[1]);

    if (!['exp', 'money', 'limite'].includes(tipo) || !isWalletResource(tipo)) return m.reply(`⚠️ Usa correctamente: /slot <xp|money|limite> <cantidad>\nEjemplo: /slot xp 500`);
    if (!cantidad || isNaN(cantidad) || cantidad < 10) return m.reply(`❌ Mínimo 10 para apostar.`);

    const saldo = user[tipo];
    if (saldo < cantidad) return m.reply(`❌ No tienes suficiente ${tipo.toUpperCase()} para apostar. Tienes *${formatNumber(saldo)}*`);

    const emojis: SlotSymbol[] = ['💎', '⚡', '🪙', '🧿', '💣', '🔮'];
    let final: SlotMatrix | null = null;
    const msg = await conn.sendMessage(m.chat, {text: render(renderRandom(emojis))}, {quoted: m});
    if (!msg) return;

    for (let i = 0; i < 6; i++) {
        await delay(300);
        if (i < 5) {
            await conn.sendMessage(m.chat, {text: render(renderRandom(emojis)), edit: msg.key});
        } else {
            final = [
                [rand(emojis), rand(emojis), rand(emojis)],
                [rand(emojis), rand(emojis), rand(emojis)],
                [rand(emojis), rand(emojis), rand(emojis)],
            ];
            await conn.sendMessage(m.chat, {text: render(final), edit: msg.key});
        }
    }
    if (!final) return;
    const resultado = evaluarLinea(final[1]);
    let ganancia = 0;
    let textoFinal = '';

    if (resultado === 'triple') {
        ganancia = cantidad * 3;
        textoFinal = `🎉 ¡Triple! Ganaste *${formatNumber(ganancia)} ${tipoBonito(tipo)}*`;
    } else if (resultado === 'doble') {
        ganancia = cantidad;
        textoFinal = `😏 Dos iguales. Recuperaste *${formatNumber(ganancia)} ${tipoBonito(tipo)}*`;
    } else {
        ganancia = -cantidad;
        textoFinal = `💀 Mala suerte. Perdiste *${formatNumber(cantidad)} ${tipoBonito(tipo)}*`;
    }

    await addWalletResourceAndSetWait(m.sender, tipo, ganancia, now);
    await delay(600);
    await conn.sendMessage(m.chat, {text: render(final) + `\n\n${textoFinal}`, edit: msg.key});
    }
});

function rand<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function render(matriz: SlotMatrix) {
    return `🎰 | *SLOTS* | 🎰\n────────────\n${matriz.map(row => row.join(' | ')).join('\n')}\n────────────`;
}

function renderRandom(emojis: SlotSymbol[]): SlotMatrix {
    const temp = [
        [rand(emojis), rand(emojis), rand(emojis)],
        [rand(emojis), rand(emojis), rand(emojis)],
        [rand(emojis), rand(emojis), rand(emojis)],
    ] as SlotMatrix;
    return temp;
}

function evaluarLinea(arr: SlotRow) {
    const [a, b, c] = arr;
    if (a === b && b === c) return 'triple';
    if (a === b || b === c || a === c) return 'doble';
    return 'nada';
}

function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

function formatNumber(num: number) {
    return num.toLocaleString('en').replace(/,/g, '.');
}

function msToTime(duration: number) {
    const s = Math.floor(duration / 1000) % 60;
    const m = Math.floor(duration / (1000 * 60)) % 60;
    return `${m ? `${m}m ` : ''}${s}s`;
}

function tipoBonito(tipo: string) {
    if (tipo === 'money') return 'LoliCoins';
    if (tipo === 'limite') return 'Diamantes';
    return 'XP';
}

