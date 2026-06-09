import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {addWalletResourceAndSetWait, getWallet} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {randomChance} from '../../utils/random.js';
import {formatDurationCompact} from '../../utils/time.js';

export default definePlugin({
    help: ['cf <cantidad>'],
    tags: ['game'],
    command: ['cf'],
    register: true,
    async execute(m, {conn, args}) {
    const bet = parseInt(args[0], 10);
    const cooldown = 30_000;
    const now = Date.now();
    if (!bet || bet <= 0) return m.reply(getRequiredPluginMessage('games.coinFlip.invalidBet'));
    const user = await getWallet(m.sender);
    if (!user || user.exp < bet) return m.reply(renderTemplate(getRequiredPluginMessage('games.coinFlip.notEnoughExp'), {
        exp: formatThousandsDot(user?.exp || 0)
    }));

    const last = Number(user.wait) || 0;
    const remaining = last + cooldown - now;
    if (now - last < cooldown) return conn.fakeReply(m.chat, renderTemplate(getRequiredPluginMessage('games.coinFlip.cooldown'), {
        time: formatDurationCompact(remaining)
    }), m.sender, getRequiredPluginMessage('games.shared.cooldownNoSpam'), 'status@broadcast');

    const outcome = randomChance(0.5) ? 'cara' : 'cruz';
    const win = outcome === 'cara';
    await addWalletResourceAndSetWait(m.sender, 'exp', win ? bet * 2 : -bet, now);
    const message = win
        ? renderTemplate(getRequiredPluginMessage('games.coinFlip.win'), {amount: formatThousandsDot(bet * 2)})
        : renderTemplate(getRequiredPluginMessage('games.coinFlip.lose'), {amount: formatThousandsDot(bet)});
    return m.reply(renderTemplate(getRequiredPluginMessage('games.coinFlip.result'), {
        icon: win ? '🎉' : '💀',
        outcome,
        message
    }));
    }
});
