import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🏦 MENÚ DE ECONOMÍA Y FINANZAS',
    help: ['menueconomia'],
    tags: ['main'],
    command: /^(menueconomia|menuecon|economia|economy)$/i,
    intro: 'E - WALLET, banco, préstamos, transferencias y tipos de cambio.',
    pluginTags: ['economy'],
});
