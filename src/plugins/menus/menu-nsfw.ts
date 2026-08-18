import {createMenuPlugin} from './menu-renderer.js';
import {canUseNsfw} from '../../utils/nsfw-access.js';
export default createMenuPlugin({
    title: '🔞 MENU NSFW - CONTENIDO EXPLÍCITO',
    help: ['menunsfw'],
    tags: ['main'],
    command: /^(menunsfw|menu18|nsfwmenu|menuadulto)$/i,
    intro: 'Familia de contenido explícito. El owner define quién puede usarla con enable nsfw y un nivel de acceso.',
    pluginTags: ['nsfw-content'],
    include: entry => entry.pluginName?.startsWith('nsfw/') === true,
    group: true,
    manualGuard: (_m, ctx) => {
        if (canUseNsfw(ctx.groupSettings || {}, ctx)) return null;
        return '🔞 El menú/contenido NSFW está desactivado o restringido para tu nivel.';
    },
});
