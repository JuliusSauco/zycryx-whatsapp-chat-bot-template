import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '👑 MENU DE OWNER - CONTROL GLOBAL DEL BOT',
    help: ['menuowner'],
    tags: ['main'],
    command: /^(menuowner|ownermenu|owners|menuowners)$/i,
    owner: true,
    intro: 'Comandos privados para mantenimiento global, seguridad y administración del bot.',
    pluginTags: ['owner'],
    include: (entry) => entry.owner || entry.rowner || entry.tags.includes('owner'),
});
