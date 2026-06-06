import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🚀 MENU DE DESCARGAS - MUSICA, VIDEOS Y ARCHIVOS',
    help: ['menudescargas'],
    tags: ['main'],
    command: /^(menudescargas|menudownloads|downloads|descargas)$/i,
    intro: 'Descargas de música, videos, redes sociales, archivos y repositorios cuando el proveedor esté disponible.',
    pluginTags: ['downloader'],
});
