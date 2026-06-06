import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🎮 MENU DE JUEGOS - RETOS Y DINAMICAS',
    help: ['menujuegos'],
    tags: ['main'],
    command: /^(menujuegos|menugames|games|juegos)$/i,
    intro: 'Juegos, retos y dinámicas sociales para usar en grupos o chats privados cuando aplique.',
    pluginTags: ['game'],
});
