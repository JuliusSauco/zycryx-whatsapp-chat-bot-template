import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {addWalletResourceAndSetWait, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {randomChance} from '../../utils/random.js';
import {formatDurationCompact} from '../../utils/time.js';

export default defineSdkPlugin({
    help: ['cf <cantidad>'],
    tags: ['game'],
    command: ['cf'],
    register: true,
    async execute(m, {conn, args, sdk}) {
    const bet = parseInt(args[0], 10);
    const cooldown = 30_000;
    const now = Date.now();
    if (!bet || bet <= 0) return sdk.reply.message('games.coinFlip.invalidBet');
    const user = await getWallet(m.sender);
    if (!user || user.exp < bet) return sdk.reply.message('games.coinFlip.notEnoughExp', {
        exp: formatThousandsDot(user?.exp || 0)
    });

    const last = Number(user.wait) || 0;
    const remaining = last + cooldown - now;
    if (now - last < cooldown) return conn.fakeReply(m.chat, sdk.content.renderMessage('games.coinFlip.cooldown', {
        time: formatDurationCompact(remaining)
    }), m.sender, sdk.content.message('games.shared.cooldownNoSpam'), 'status@broadcast');

    const outcome = randomChance(0.5) ? 'cara' : 'cruz';
    const win = outcome === 'cara';
    await addWalletResourceAndSetWait(m.sender, 'exp', win ? bet * 2 : -bet, now, 'game_bet', 'coin_flip');
    const message = win
        ? sdk.content.renderMessage('games.coinFlip.win', {amount: formatThousandsDot(bet * 2)})
        : sdk.content.renderMessage('games.coinFlip.lose', {amount: formatThousandsDot(bet)});
    return sdk.reply.message('games.coinFlip.result', {
        icon: win ? '🎉' : '💀',
        outcome,
        message
    });
    }
});
