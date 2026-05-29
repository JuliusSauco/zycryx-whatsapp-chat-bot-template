import {definePlugin} from '../core/define-plugin.js'
import {listWallets} from '../services/wallet.service.js';

export default definePlugin({
    help: ['topstreak [página]'],
    tags: ['econ'],
    command: ['topstreak', 'streaktop', 'streak'],
    register: true,
    async execute(m, {conn, args}) {
    const page = Math.max(1, parseInt(args[0]) || 1);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const now = Date.now();
    const twoDaysMs = 172800000; // 2 días

    const users = (await listWallets())
        .filter((u: any) => u.dailystreak > 0 && now - Number(u.lastclaim) <= twoDaysMs)
        .sort((a: any, b: any) => b.dailystreak - a.dailystreak);
    const totalActivos = users.length;

    if (!users.length) return m.reply(`⚠️ No hay usuarios activos en racha.\n\n¡Recuerda reclamar tu recompensa diaria usando /claim para aparecer aquí!`);

    const paginated = users.slice(offset, offset + pageSize);

    if (!paginated.length) return m.reply(`⚠️ No hay usuarios en esta página.\n\n¡Recuerda reclamar tu recompensa diaria usando /claim para aparecer aquí!`);

    let ranking = `🏆 *TOP RACHAS DIARIAS* (Página ${page})\n📊 Usuario(s) activo(s) en racha: *${totalActivos}*\n\n`;

    for (let i = 0; i < paginated.length; i++) {
        const user = paginated[i];
        const numero = user.id.replace(/@.+/, '');
        const nombre = (user.nombre || `+${numero}`);
        const puesto = offset + i + 1;

        const streak = user.dailystreak;
        let premio = '';

        if (streak >= 100) {
            premio = '🏆'; //pro
        } else if (streak >= 50) {
            premio = '🥇';
        } else if (streak >= 30) {
            premio = '🏅';
        } else if (streak % 7 === 0) {
            premio = '⭐';
        }

        const corona = (puesto === 1) ? '(👑)' : '';

        ranking += `${puesto}. *${nombre}* ${corona}\n    🔥 Racha: ${streak} día(s) ${premio}\n\n`;
    }

    ranking += `\n✨ _Sigue reclamando tu recompensa diaria usando /claim para aparecer en el ranking y ganar bonos épicos._ ✨`;

    m.reply(ranking.trim());
    }
});


;
