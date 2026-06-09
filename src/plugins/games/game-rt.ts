import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {addWalletResourceAndSetWait, getWallet} from '../../services/wallet.service.js';
import {randomInt} from '../../utils/random.js';
import {formatDurationCompact} from '../../utils/time.js';

export default definePlugin({
    help: ['rt <color> <cantidad>', 'ruleta <color> <cantidad>'],
    tags: ['game'],
    command: ['rt', 'ruleta', 'ruletas'],
    register: true,
    async execute(m, {conn, args, command, usedPrefix}) {
    const cooldown = 30_000;
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return conn.reply(m.chat, getRequiredPluginMessage('games.shared.missingUser'), m);
    const lastWait = Number(user?.wait) || 0;
    const remaining = lastWait + cooldown - now;

    if (remaining > 0) return conn.fakeReply(m.chat, renderTemplate(getRequiredPluginMessage('games.shared.cooldown'), {
        time: formatDurationCompact(remaining)
    }), m.sender, getRequiredPluginMessage('games.shared.cooldownNoSpam'), 'status@broadcast');
    if (args.length < 2) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('games.roulette.usage'), {
        command: usedPrefix + command
    }), m);
    const color = args[0].toLowerCase();
    const betAmount = parseInt(args[1]);
    if (!['red', 'black', 'green'].includes(color)) return conn.reply(m.chat, getRequiredPluginMessage('games.roulette.invalidColor'), m);
    if (isNaN(betAmount) || betAmount <= 0) return conn.reply(m.chat, getRequiredPluginMessage('games.roulette.invalidAmount'), m);
    if (user.exp < betAmount) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('games.roulette.notEnoughExp'), {
        exp: formatExp(user.exp)
    }), m);

    const resultColor = getRandomColor();
    const isWin = resultColor === color;
    let winAmount = 0;

    if (isWin) {
        winAmount = color === 'green' ? betAmount * 14 : betAmount * 2;
    }

    await addWalletResourceAndSetWait(m.sender, 'exp', -betAmount + winAmount, now);
    const message = isWin
        ? renderTemplate(getRequiredPluginMessage('games.roulette.win'), {amount: formatExp(winAmount)})
        : renderTemplate(getRequiredPluginMessage('games.roulette.lose'), {amount: formatExp(betAmount)});
    return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('games.roulette.result'), {
        color: resultColor,
        message
    }), m);
    }
});

function getRandomColor() {
    const random = randomInt(10_000);
    if (random < 4750) return 'red';
    if (random < 9500) return 'black';
    return 'green';
}

function formatExp(amount: number) {
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k (${amount.toLocaleString()})`;
    return amount.toLocaleString();
}

