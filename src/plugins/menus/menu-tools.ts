import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🔧 MENU DE HERRAMIENTAS - UTILIDADES',
    help: ['menutools'],
    tags: ['main'],
    command: /^(menutools|menuherramientas|herramientas|tools)$/i,
    intro: 'Utilidades para inspeccionar, traducir, reconocer música, mejorar imágenes y trabajar con datos.',
    pluginTags: ['tools'],
});
