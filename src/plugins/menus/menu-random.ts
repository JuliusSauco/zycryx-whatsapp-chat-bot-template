import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🪄 MENU RANDOM Y DIVERSION',
    help: ['menurandom'],
    tags: ['main'],
    command: /^(menurandom|menurandow|menuanime|random|randow)$/i,
    intro: 'Imágenes, memes, frases, juegos sociales y acciones SFW para darle variedad al chat.',
    pluginTags: ['randow', 'fun'],
});
