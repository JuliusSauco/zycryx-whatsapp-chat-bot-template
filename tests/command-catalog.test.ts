import assert from 'node:assert/strict';
import {
    getCommandCatalog,
    getCommandCatalogEntry,
    getFallbackCommandEmoji,
    getCommandCatalogMatch,
    normalizeCommandCatalogKey,
} from '../src/services/command-catalog.service.js';
import {getCommandMetadata, getMenuCommandDedupeKey} from '../src/plugins/menus/menu-command-metadata.js';

const catalog = getCommandCatalog();
const entries = Object.entries(catalog.commands);

assert.equal(catalog.version, 1);
assert.ok(entries.length >= 100, 'command catalog should cover the current menu surface');
assert.ok(catalog.guidelines.descriptionStyle?.includes('WhatsApp'));

for (const [key, entry] of entries) {
    assert.ok(entry.emoji.trim().length > 0, `missing emoji: ${key}`);
    assert.ok(entry.usage.trim().length > 0, `missing usage: ${key}`);
    assert.ok(entry.description.trim().length > 0, `missing description: ${key}`);
    assert.ok(entry.description.length <= 140, `description too long for WhatsApp: ${key}`);

    for (const alias of entry.aliases || []) {
        assert.notEqual(alias.trim().toLowerCase(), key, `alias duplicates command key: ${key}`);
    }
}

assert.equal(normalizeCommandCatalogKey('.topinactive2 --date'), 'topinactive');
assert.equal(normalizeCommandCatalogKey('#config accesos'), 'config acceso');
assert.equal(normalizeCommandCatalogKey('/enable autoresponder --triggerall'), 'enable autoresponder --triggerall');
assert.equal(getCommandCatalogEntry('help')?.usage, 'menu');
assert.equal(getCommandCatalogEntry('ayuda')?.usage, 'menu');
assert.equal(getCommandCatalogEntry('translate')?.usage, 'traducir <idioma> <texto>');
assert.equal(getCommandCatalogEntry('testspeed')?.usage, 'speedtest');
assert.equal(getCommandCatalogEntry('status')?.usage, 'estado');
assert.equal(getCommandCatalogEntry('grouplist')?.usage, 'groups');
assert.equal(getCommandCatalogEntry('s')?.usage, 'sticker');
assert.equal(getCommandCatalogEntry('apkmod')?.usage, 'apk <app>');
assert.equal(getCommandCatalogEntry('gimage')?.usage, 'image <busqueda>');
assert.equal(getCommandCatalogEntry('ttsearch')?.usage, 'tiktoksearch <texto>');
assert.equal(getCommandCatalogEntry('gitpull')?.usage, 'update');
assert.equal(getCommandCatalogEntry('gp')?.usage, 'getplugin <nombre>');
assert.equal(getCommandCatalogEntry('googlef')?.usage, 'google <busqueda>');
assert.equal(getCommandCatalogEntry('lirik')?.usage, 'lyrics <cancion>');
assert.equal(getCommandCatalogEntry('inspect')?.usage, 'superinspect <url>');
assert.equal(getCommandCatalogEntry('remini')?.usage, 'hd');
assert.equal(getCommandCatalogEntry('gtts')?.usage, 'tts <voz|idioma> <texto>');
assert.equal(getCommandCatalogEntry('upload')?.usage, 'tourl [servicio]');
assert.equal(getCommandCatalogEntry('menugif')?.usage, 'menu3');
assert.equal(getCommandCatalogEntry('audios')?.usage, 'menu2');
assert.equal(getCommandCatalogEntry('ttc')?.usage, 'ttt');
assert.equal(getCommandCatalogEntry('cf')?.usage, 'cf <cantidad>');
assert.equal(getCommandCatalogEntry('pelicula')?.usage, 'pelicula');
assert.equal(getCommandCatalogEntry('piropo')?.usage, 'piropo');
assert.equal(getCommandCatalogEntry('insult')?.usage, 'ins @usuario');
assert.equal(getCommandCatalogEntry('trio-hmh')?.usage, 'trio @usuario @usuario');
assert.equal(getCommandCatalogEntry('meg')?.usage, 'megumin');
assert.equal(getCommandCatalogEntry('pechos')?.usage, 'tetas');
assert.equal(getCommandCatalogEntry('qr')?.usage, 'jadibot');
assert.equal(getCommandCatalogEntry('setprestar')?.usage, 'setprestar <0|1>');
assert.equal(getCommandCatalogEntry('grupo abrir')?.usage, 'group open');
assert.equal(getCommandCatalogEntry('claim')?.usage, 'daily');
assert.equal(getCommandCatalogEntry('addxp')?.usage, 'addexp @usuario <cantidad>');
assert.equal(getCommandCatalogEntry('vender')?.usage, 'rw-vender');
assert.equal(getCommandCatalogEntry('dados')?.usage, 'dado');
assert.equal(getCommandCatalogEntry('kiss')?.usage, 'kiss @usuario');
assert.equal(getCommandCatalogEntry('gifkiss')?.usage, 'gifkiss @usuario');
assert.equal(getCommandCatalogEntry('s-kill')?.usage, 's-kill @usuario');
assert.equal(getCommandCatalogEntry('abrazito')?.usage, 'abrazito @usuario');
assert.equal(getCommandCatalogEntry('bratvid')?.usage, 'brat <texto>');
assert.equal(getCommandCatalogEntry('abrazo')?.usage, 'hug @usuario');
assert.equal(getCommandCatalogEntry('top')?.usage, 'top <tema>');
assert.equal(getCommandCatalogEntry('lb')?.usage, 'leaderboard');
assert.equal(getCommandCatalogEntry('setprompt borrar')?.usage, 'setprompt delete');
assert.equal(getCommandCatalogEntry('enable welcome --hidetagadmin')?.usage, 'enable welcome [--hidetagadmin|--hidetag]');
assert.equal(getCommandCatalogEntry('disable autoresponder --triggerall')?.usage, 'disable autoresponder --triggerall');
assert.equal(getCommandCatalogEntry('dance')?.usage, 'dance');
assert.equal(getCommandCatalogEntry('smile')?.usage, 'smile @usuario');
assert.equal(getCommandMetadata('topinactive2 --date', ['group']).usage, 'topinactive[pagina] [--number] [--date]');
assert.equal(getCommandMetadata('db info', ['owner']).usage, 'db info');
assert.equal(getCommandCatalogMatch('db info')?.source, 'exact');
assert.equal(getMenuCommandDedupeKey('play2'), getMenuCommandDedupeKey('play'));
assert.notEqual(getMenuCommandDedupeKey('db info'), getMenuCommandDedupeKey('db optimizar'));
assert.equal(getFallbackCommandEmoji(['missing', 'game']), '🎮');

console.log('command-catalog.test.ts OK');
