import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🧧 MENU DE STICKERS - CREACION Y REACCIONES',
    help: ['menusticker'],
    tags: ['main'],
    command: /^(menusticker|menustickers|stickers|sticker)$/i,
    intro: 'Creación, edición, descarga y stickers de reacción para responder con estilo.',
    pluginTags: ['sticker'],
});
