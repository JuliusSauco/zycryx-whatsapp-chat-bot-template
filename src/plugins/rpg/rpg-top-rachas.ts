import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {listWallets} from '../../services/wallet.service.js';
import type {UserWallet} from '../../domain/users.js';

export default defineSdkPlugin({
    help: ['topstreak [página]'],
    tags: ['rpg'],
    command: ['topstreak', 'streaktop', 'streak'],
    register: true,
    async execute(m, {args, sdk}) {
    const page = Math.max(1, parseInt(args[0]) || 1);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const now = Date.now();
    const twoDaysMs = 172800000; // 2 días

    const users: UserWallet[] = (await listWallets())
        .filter(u => u.dailystreak > 0 && now - Number(u.lastclaim) <= twoDaysMs)
        .sort((a, b) => b.dailystreak - a.dailystreak);
    const totalActivos = users.length;

    if (!users.length) return sdk.reply.message('rpg.streakTop.noActive');

    const paginated = users.slice(offset, offset + pageSize);

    if (!paginated.length) return sdk.reply.message('rpg.streakTop.noPage');

    let ranking = sdk.content.renderMessage('rpg.streakTop.header', {
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
            premio = sdk.content.message('rpg.streakTop.prizeHundred');
        } else if (streak >= 50) {
            premio = sdk.content.message('rpg.streakTop.prizeFifty');
        } else if (streak >= 30) {
            premio = sdk.content.message('rpg.streakTop.prizeThirty');
        } else if (streak % 7 === 0) {
            premio = sdk.content.message('rpg.streakTop.prizeWeekly');
        }

        const corona = (puesto === 1) ? sdk.content.message('rpg.streakTop.crown') : '';

        ranking += sdk.content.renderMessage('rpg.streakTop.line', {
            position: puesto,
            name: nombre,
            crown: corona,
            streak,
            prize: premio
        });
    }

    ranking += sdk.content.message('rpg.streakTop.footer');

    await sdk.reply.text(ranking.trim());
    }
});


;
