import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🔧 MENU DE HERRAMIENTAS - UTILIDADES Y CONVERSIONES',
    help: ['menutools'],
    tags: ['main'],
    command: /^(menutools|menuherramientas|herramientas|tools)$/i,
    intro: 'Utilidades para convertir, inspeccionar, traducir, reconocer música y trabajar con archivos.',
    pluginTags: ['tools', 'convertidor'],
});
