import {createMenuPlugin} from './menu-renderer.js';
export default createMenuPlugin({
    title: '🔞 MENU NSFW - CONTENIDO EXPLÍCITO',
    help: ['menunsfw'],
    tags: ['main'],
    command: /^(menunsfw|menu18|nsfwmenu|menuadulto)$/i,
    intro: 'Familia de contenido explícito. El owner define quién puede usarla con enable nsfw y un nivel de acceso.',
    pluginTags: ['nsfw'],
    include: entry => entry.pluginName?.startsWith('nsfw/') === true,
    group: true,
    owner: true,
    manualGuard: (_m, ctx) => {
        if (ctx.groupSettings?.modohorny) return null;
        return '🔞 Este menú solo está disponible si NSFW está habilitado en el grupo.';
    },
});
