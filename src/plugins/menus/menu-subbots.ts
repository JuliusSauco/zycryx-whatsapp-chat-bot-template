import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '✨ MENU DE SUBBOTS - SESIONES Y PERSONALIZACION',
    help: ['menusubbot'],
    tags: ['main'],
    command: /^(menusubbot|menusubbots|subbots|jadibotmenu)$/i,
    intro: 'Sesiones, privacidad y personalización de subbots disponibles en esta plantilla.',
    pluginTags: ['jadibot'],
});
