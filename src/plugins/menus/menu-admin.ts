import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🛡️ MENU DE ADMIN - MODERACION Y CONFIGURACION',
    help: ['menuadmin'],
    tags: ['main'],
    command: /^(menuadmin|adminmenu|menuadmins|admins)$/i,
    intro: 'Solo admins del grupo y owners pueden ver estos comandos de moderación y configuración.',
    pluginTags: ['group', 'nable'],
    include: (entry) => entry.admin || entry.botAdmin || entry.tags.includes('nable'),
    manualGuard: (_m, ctx) => {
        if (ctx.isAdmin || ctx.isOwner) return null;
        if (!ctx.isGroup) return '👥 Este menú es para grupos; solo un owner puede verlo fuera de un grupo.';
        return '🛡️ Este menú solo puede verlo un admin del grupo o un owner del bot.';
    },
});
