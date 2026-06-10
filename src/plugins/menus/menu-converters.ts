import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🔄 MENU DE CONVERTIDORES',
    help: ['menuconvertidores'],
    tags: ['main'],
    command: /^(menuconvertidores|menuconverters|convertidores|converters|converter)$/i,
    intro: 'Conversiones de audio, stickers, texto, voz y archivos enviados al chat.',
    pluginTags: ['convertidor'],
});
