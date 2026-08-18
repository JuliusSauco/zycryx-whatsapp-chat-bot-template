import {createMenuPlugin} from './menu-renderer.js';

export default createMenuPlugin({
    title: '🎮 MENÚ RPG - PROGRESIÓN Y GACHA',
    help: ['menurpg'],
    tags: ['main'],
    command: /^(menurpg|rpgmenu)$/i,
    intro: 'Registro, niveles, actividades, pareja y gacha para progresar dentro del bot.',
    pluginTags: ['rg', 'gacha', 'rpg'],
});
