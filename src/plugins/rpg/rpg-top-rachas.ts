import {definePlugin} from '../../core/define-plugin.js'
import {listWallets} from '../../services/wallet.service.js';
import type {UserWallet} from '../../ports/repositories.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['topstreak [página]'],
    tags: ['econ'],
    command: ['topstreak', 'streaktop', 'streak'],
    register: true,
    async execute(m, {args}) {
    const page = Math.max(1, parseInt(args[0]) || 1);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const now = Date.now();
    const twoDaysMs = 172800000; // 2 días

    const users: UserWallet[] = (await listWallets())
        .filter(u => u.dailystreak > 0 && now - Number(u.lastclaim) <= twoDaysMs)
        .sort((a, b) => b.dailystreak - a.dailystreak);
    const totalActivos = users.length;

    if (!users.length) return m.reply(getRequiredPluginMessage('rpg.streakTop.noActive'));

    const paginated = users.slice(offset, offset + pageSize);

    if (!paginated.length) return m.reply(getRequiredPluginMessage('rpg.streakTop.noPage'));

    let ranking = renderTemplate(getRequiredPluginMessage('rpg.streakTop.header'), {
        page,
        totalActive: totalActivos
    });

    for (let i = 0; i < paginated.length; i++) {
        const user = paginated[i];
        const numero = user.id.replace(/@.+/, '');
        const nombre = (user.nombre || `+${numero}`);
        const puesto = offset + i + 1;

        const streak = user.dailystreak;
        let premio = '';

        if (streak >= 100) {
            premio = getRequiredPluginMessage('rpg.streakTop.prizeHundred');
        } else if (streak >= 50) {
            premio = getRequiredPluginMessage('rpg.streakTop.prizeFifty');
        } else if (streak >= 30) {
            premio = getRequiredPluginMessage('rpg.streakTop.prizeThirty');
        } else if (streak % 7 === 0) {
            premio = getRequiredPluginMessage('rpg.streakTop.prizeWeekly');
        }

        const corona = (puesto === 1) ? getRequiredPluginMessage('rpg.streakTop.crown') : '';

        ranking += renderTemplate(getRequiredPluginMessage('rpg.streakTop.line'), {
            position: puesto,
            name: nombre,
            crown: corona,
            streak,
            prize: premio
        });
    }

    ranking += getRequiredPluginMessage('rpg.streakTop.footer');

    m.reply(ranking.trim());
    }
});


;
