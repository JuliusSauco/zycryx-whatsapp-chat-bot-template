import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {addWalletResourceAndSetWait, getWallet} from '../../services/wallet.service.js';
import {randomInt} from '../../utils/random.js';
import {formatDurationCompact} from '../../utils/time.js';

export default defineSdkPlugin({
    help: ['rt <color> <cantidad>', 'ruleta <color> <cantidad>'],
    tags: ['game'],
    command: ['rt', 'ruleta', 'ruletas'],
    register: true,
    async execute(m, {conn, args, command, usedPrefix, sdk}) {
    const cooldown = 30_000;
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return sdk.reply.message('games.shared.missingUser');
    const lastWait = Number(user?.wait) || 0;
    const remaining = lastWait + cooldown - now;

    if (remaining > 0) return conn.fakeReply(m.chat, sdk.content.renderMessage('games.shared.cooldown', {
        time: formatDurationCompact(remaining)
    }), m.sender, sdk.content.message('games.shared.cooldownNoSpam'), 'status@broadcast');
    if (args.length < 2) return sdk.reply.message('games.roulette.usage', {
        command: usedPrefix + command
    });
    const color = args[0].toLowerCase();
    const betAmount = parseInt(args[1]);
    if (!['red', 'black', 'green'].includes(color)) return sdk.reply.message('games.roulette.invalidColor');
    if (isNaN(betAmount) || betAmount <= 0) return sdk.reply.message('games.roulette.invalidAmount');
    if (user.exp < betAmount) return sdk.reply.message('games.roulette.notEnoughExp', {
        exp: formatExp(user.exp)
    });

    const resultColor = getRandomColor();
    const isWin = resultColor === color;
    let winAmount = 0;

    if (isWin) {
        winAmount = color === 'green' ? betAmount * 14 : betAmount * 2;
    }

    await addWalletResourceAndSetWait(m.sender, 'exp', -betAmount + winAmount, now, 'game_bet', 'roulette');
    const message = isWin
        ? sdk.content.renderMessage('games.roulette.win', {amount: formatExp(winAmount)})
        : sdk.content.renderMessage('games.roulette.lose', {amount: formatExp(betAmount)});
    return sdk.reply.message('games.roulette.result', {
        color: resultColor,
        message
    });
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

