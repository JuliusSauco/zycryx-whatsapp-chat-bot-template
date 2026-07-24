import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureAccessGuard} from '../src/guards/feature-access.guard.js';
import type {GuardContext} from '../src/types/guard.js';
import {createDefaultFamilyAccessMap, defaultFamilyAccess, mergeFamilyAccessRules} from '../src/utils/family-access.js';
import {getFamilyManagerLevel, getRequiredFamilyManagerLevel} from '../src/utils/family-access-authority.js';
import {renderConfigOnboarding, renderConfigView} from '../src/plugins/config/config-toggle-menu.js';

function context(overrides: Record<string, unknown> = {}, plugin: Record<string, unknown> = {}): GuardContext {
    return {
        ctx: {
            isGroup: true,
            isOwner: false,
            isAdmin: false,
            isGroupCreator: false,
            groupSettings: {familyAccess: createDefaultFamilyAccessMap()},
            ...overrides,
        },
        plugin,
    } as unknown as GuardContext;
}

assert.deepEqual(defaultFamilyAccess('games'), {enabled: true, accessMode: 'all'});
assert.deepEqual(defaultFamilyAccess('audio'), {enabled: false, accessMode: 'all'});
assert.deepEqual(defaultFamilyAccess('nsfw'), {enabled: false, accessMode: 'owner'});

const onboarding = renderConfigOnboarding('.');
assert.match(onboarding, /`PERMISOS DEL BOT`/);
assert.match(onboarding, /\.enable juegos --all/);
assert.match(onboarding, /\.enable nsfwgif --owner/);
assert.match(onboarding, /\.config comandos/);
assert.match(onboarding, /--superadmin/);

const configView = renderConfigView({
    prefix: '.',
    command: 'config',
    isGroup: true,
    enabledIcon: '✅',
    disabledIcon: '❌',
    notGroupIcon: '⚠️',
    group: {welcome: true, bye: false, antilink: true},
    familyAccess: createDefaultFamilyAccessMap(),
    subbot: null,
    isSubbot: false,
    isAdmin: true,
    isOwner: true,
    isGroupCreator: true,
});
assert.match(configView, /`GRUPO ACTUAL`/);
assert.match(configView, /Bienvenida.*✅/);
assert.match(configView, /Deshabilitar: \*\.disable welcome\*/);
assert.match(configView, /Despedida.*❌/);
assert.match(configView, /Habilitar: \*\.enable bye\*/);
assert.match(configView, /Juegos.*todos/);

const ownerView = renderConfigView({
    prefix: '.',
    command: 'config',
    isGroup: false,
    enabledIcon: '✅',
    disabledIcon: '❌',
    notGroupIcon: '⚠️',
    group: {},
    familyAccess: createDefaultFamilyAccessMap(),
    subbot: {prefix: ['.'], mode: 'public', owners: [], anti_private: true, anti_call: false},
    isSubbot: true,
    isAdmin: false,
    isOwner: true,
    isGroupCreator: false,
});
assert.match(ownerView, /`CONFIGURACIÓN OWNER`/);
assert.match(ownerView, /Antiprivado.*✅/);
assert.doesNotMatch(ownerView, /Juegos/);

const merged = mergeFamilyAccessRules([{target: 'games', rule: {enabled: false, accessMode: 'admin'}}]);
assert.deepEqual(merged.games, {enabled: false, accessMode: 'admin'});
assert.deepEqual(merged.downloads, {enabled: true, accessMode: 'all'});

assert.equal(getFamilyManagerLevel({isOwner: false, isGroupCreator: false, isAdmin: true}), 1);
assert.equal(getFamilyManagerLevel({isOwner: false, isGroupCreator: true, isAdmin: true}), 2);
assert.equal(getRequiredFamilyManagerLevel(
    {enabled: true, accessMode: 'owner'},
    {enabled: true, accessMode: 'all'},
), 3);
assert.equal(getRequiredFamilyManagerLevel(
    {enabled: false, accessMode: 'admin'},
    {enabled: true, accessMode: 'admin'},
), 3);
assert.equal(getRequiredFamilyManagerLevel(
    {enabled: true, accessMode: 'admin'},
    {enabled: false, accessMode: 'admin'},
), 3);

assert.equal(await featureAccessGuard(context({}, {feature: 'games'})), null);

const disabledAccess = createDefaultFamilyAccessMap();
disabledAccess.games = {enabled: false, accessMode: 'all'};
assert.match(String(await featureAccessGuard(context({groupSettings: {familyAccess: disabledAccess}}, {feature: 'games'}))), /desactivada/);
assert.match(String(await featureAccessGuard(context({isOwner: true, groupSettings: {familyAccess: disabledAccess}}, {feature: 'games'}))), /desactivada/);
assert.equal(await featureAccessGuard(context({groupSettings: {familyAccess: disabledAccess}}, {feature: 'games', owner: true})), null);

const adminAccess = createDefaultFamilyAccessMap();
adminAccess.games = {enabled: true, accessMode: 'admin'};
assert.match(String(await featureAccessGuard(context({groupSettings: {familyAccess: adminAccess}}, {feature: 'games'}))), /admins/);
assert.equal(await featureAccessGuard(context({isAdmin: true, groupSettings: {familyAccess: adminAccess}}, {feature: 'games'})), null);
adminAccess.games = {enabled: true, accessMode: 'superadmin'};
assert.match(String(await featureAccessGuard(context({isAdmin: true, groupSettings: {familyAccess: adminAccess}}, {feature: 'games'}))), /creador/);
assert.equal(await featureAccessGuard(context({isGroupCreator: true, groupSettings: {familyAccess: adminAccess}}, {feature: 'games'})), null);
adminAccess.games = {enabled: true, accessMode: 'owner'};
assert.equal(await featureAccessGuard(context({isOwner: true, groupSettings: {familyAccess: adminAccess}}, {feature: 'games'})), null);
assert.equal(await featureAccessGuard(context({isGroup: false, groupSettings: {familyAccess: disabledAccess}}, {feature: 'games'})), null);

const migration = fs.readFileSync('src/db/migrations/0027_group_command_access_rules.sql', 'utf8');
assert.match(migration, /scope.*family.*command/s);
for (const family of ['games', 'tools', 'rpg', 'downloads', 'search', 'stickers', 'converters', 'fun', 'audio', 'gifs', 'nsfw', 'nsfw-gifs']) {
    assert.match(migration, new RegExp(`'${family.replace('-', '\\-')}'`), `missing migration backfill for ${family}`);
}

console.log('family-access.test.ts OK');
