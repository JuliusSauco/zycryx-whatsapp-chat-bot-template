import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '👥 MENU DE GRUPO - INFORMACION Y CONVIVENCIA',
    help: ['menugrupo'],
    tags: ['main'],
    command: /^(menugrupo|menugroup|groupmenu|menugrupo)$/i,
    group: true,
    intro: 'Comandos visibles para miembros del grupo; para moderación usa el menú de admins.',
    pluginTags: ['group'],
    include: (entry) => !entry.admin && !entry.botAdmin && !entry.owner && !entry.rowner,
});
