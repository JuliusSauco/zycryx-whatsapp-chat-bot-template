import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {addWalletResourceAndSetWait, getWallet, isWalletResource} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {delay, pickRandom} from '../../utils/random.js';
import {formatDurationCompact} from '../../utils/time.js';

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
    if (!user) return m.reply(getRequiredPluginMessage('games.shared.missingUser'));

    const last = Number(user?.wait) || 0;
    const remaining = last + cooldown - now;
    if (remaining > 0) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('games.slot.cooldown'), {
        time: formatDurationCompact(remaining)
    }), m);

    const tipoArg = (args[0] || '').toLowerCase();
    const tipo = tipoArg === 'xp' ? 'exp' : tipoArg;
    const cantidad = parseInt(args[1]);

    if (!['exp', 'money', 'limite'].includes(tipo) || !isWalletResource(tipo)) return m.reply(getRequiredPluginMessage('games.slot.usage'));
    if (!cantidad || isNaN(cantidad) || cantidad < 10) return m.reply(getRequiredPluginMessage('games.slot.minBet'));

    const saldo = user[tipo];
    if (saldo < cantidad) return m.reply(renderTemplate(getRequiredPluginMessage('games.slot.notEnough'), {
        resource: tipo.toUpperCase(),
        balance: formatThousandsDot(saldo)
    }));

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
                [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)],
                [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)],
                [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)],
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
        textoFinal = renderTemplate(getRequiredPluginMessage('games.slot.triple'), {
            amount: formatThousandsDot(ganancia),
            resource: tipoBonito(tipo)
        });
    } else if (resultado === 'doble') {
        ganancia = cantidad;
        textoFinal = renderTemplate(getRequiredPluginMessage('games.slot.double'), {
            amount: formatThousandsDot(ganancia),
            resource: tipoBonito(tipo)
        });
    } else {
        ganancia = -cantidad;
        textoFinal = renderTemplate(getRequiredPluginMessage('games.slot.lose'), {
            amount: formatThousandsDot(cantidad),
            resource: tipoBonito(tipo)
        });
    }

    await addWalletResourceAndSetWait(m.sender, tipo, ganancia, now);
    await delay(600);
    await conn.sendMessage(m.chat, {text: render(final) + `\n\n${textoFinal}`, edit: msg.key});
    }
});

function render(matriz: SlotMatrix) {
    return renderTemplate(getRequiredPluginMessage('games.slot.board'), {
        rows: matriz.map(row => row.join(' | ')).join('\n')
    });
}

function renderRandom(emojis: SlotSymbol[]): SlotMatrix {
    const temp = [
        [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)],
        [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)],
        [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)],
    ] as SlotMatrix;
    return temp;
}

function evaluarLinea(arr: SlotRow) {
    const [a, b, c] = arr;
    if (a === b && b === c) return 'triple';
    if (a === b || b === c || a === c) return 'doble';
    return 'nada';
}

function tipoBonito(tipo: string) {
    if (tipo === 'money') return 'LoliCoins';
    if (tipo === 'limite') return 'Diamantes';
    return 'XP';
}

