import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🪄 MENU RANDOM - ANIME, MEMES Y SORPRESAS',
    help: ['menurandom'],
    tags: ['main'],
    command: /^(menurandom|menurandow|menuanime|random|randow)$/i,
    intro: 'Imágenes, memes y acciones aleatorias SFW para darle variedad al chat.',
    pluginTags: ['randow'],
});
