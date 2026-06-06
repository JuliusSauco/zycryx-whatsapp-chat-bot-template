import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🔞 MENU NSFW - CONTENIDO ADULTO HABILITADO',
    help: ['menunsfw'],
    tags: ['main'],
    command: /^(menunsfw|menu18|nsfwmenu|menuadulto)$/i,
    intro: 'Contenido adulto disponible solo cuando un admin habilitó NSFW en este grupo.',
    pluginTags: ['nsfw', 'hot'],
    manualGuard: (_m, ctx) => {
        if (ctx.isOwner || ctx.groupSettings?.modohorny) return null;
        if (!ctx.isGroup) return '🔞 Este menú solo puede verse en grupos con NSFW habilitado o por owners.';
        return '🔞 Este menú solo está disponible si un admin habilitó NSFW en el grupo.';
    },
});
