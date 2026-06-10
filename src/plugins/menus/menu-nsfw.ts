import {createMenuPlugin} from './menu-renderer.js';
import {accessModeLabel} from '../../utils/access-mode.js';
import {canUseNsfw} from '../../utils/nsfw-access.js';

export default createMenuPlugin({
    title: '🔞 MENU NSFW - CONTENIDO ADULTO HABILITADO',
    help: ['menunsfw'],
    tags: ['main'],
    command: /^(menunsfw|menu18|nsfwmenu|menuadulto)$/i,
    intro: 'Contenido adulto disponible solo cuando NSFW está habilitado para tu nivel en este grupo.',
    pluginTags: ['nsfw', 'hot'],
    manualGuard: (_m, ctx) => {
        if (canUseNsfw(ctx.groupSettings || {}, ctx)) return null;
        if (!ctx.isGroup) return '🔞 Este menú solo puede verse en grupos con NSFW habilitado o por owners.';
        if (ctx.groupSettings?.modohorny) return `🔞 Este menú está disponible solo para: *${accessModeLabel(ctx.groupSettings.nsfwAccessMode)}*.`;
        return '🔞 Este menú solo está disponible si NSFW está habilitado en el grupo.';
    },
});
