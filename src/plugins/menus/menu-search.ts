import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🔍 MENU DE BUSQUEDAS E IA - CONSULTAS Y GENERACION',
    help: ['menubuscar'],
    tags: ['main'],
    command: /^(menubuscar|menusearch|menuia|busquedas|search)$/i,
    intro: 'Buscadores, letras, imágenes y asistentes de IA para consultar o generar contenido.',
    pluginTags: ['buscadores'],
});
