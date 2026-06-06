import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '💎 MENU RPG - ECONOMIA, NIVELES Y GACHA',
    help: ['menurpg'],
    tags: ['main'],
    command: /^(menurpg|menuecon|menueconomia|rpgmenu|economia)$/i,
    intro: 'Economía, registro, niveles, pareja y gacha para progresar dentro del bot.',
    pluginTags: ['econ', 'rg', 'gacha', 'rpg'],
});
