import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    ROLEPLAY_MAX_ACTIVE_BUYERS, SLUT_LICENSE_PRICE_COINS,
    parseRoleplayDuration, resolveRoleplayHourlyPrice,
} from '../src/domain/roleplay.js';
import {listSlutActions, resolveSlutAction} from '../src/plugins/roleplay/slut-actions.js';

assert.equal(SLUT_LICENSE_PRICE_COINS, 1_000);
assert.equal(ROLEPLAY_MAX_ACTIVE_BUYERS, 5);
assert.deepEqual(resolveRoleplayHourlyPrice(1), {
    kind: 'success', price: 1_000, pricingMode: 'automatic', maximum: 1_000,
});
assert.deepEqual(resolveRoleplayHourlyPrice(9), {
    kind: 'success', price: 9_000, pricingMode: 'automatic', maximum: 9_000,
});
assert.deepEqual(resolveRoleplayHourlyPrice(10, 7_500), {
    kind: 'success', price: 7_500, pricingMode: 'custom', maximum: 10_000,
});
assert.deepEqual(resolveRoleplayHourlyPrice(15, 15_001), {
    kind: 'invalid_price', minimum: 1_000, maximum: 15_000,
});
assert.equal(resolveRoleplayHourlyPrice(9, 1_000).kind, 'invalid_price');
assert.deepEqual(parseRoleplayDuration(undefined), {kind: 'success', mode: 'fixed', hours: 1});
assert.deepEqual(parseRoleplayDuration('2'), {kind: 'success', mode: 'fixed', hours: 2});
assert.deepEqual(parseRoleplayDuration('i'), {kind: 'success', mode: 'indefinite', hours: null});
assert.equal(parseRoleplayDuration('0').kind, 'invalid');

const responseResource = JSON.parse(readFileSync('resources/data/roleplay/slut-responses.json', 'utf8')) as {
    actions: Record<string, {responses: Array<{id: string; text: string}>}>;
};
assert.equal(Object.keys(responseResource.actions).length, 26);
assert.equal(Object.values(responseResource.actions).every(action => action.responses.length === 10), true);
assert.equal(new Set(Object.values(responseResource.actions).flatMap(action => action.responses.map(response => response.id))).size, 260);
assert.equal(Object.values(responseResource.actions).flatMap(action => action.responses).every(response => response.text.length > 180), true);
assert.equal(listSlutActions().length, 26);
assert.equal(resolveSlutAction('follar')?.code, 'cog');
assert.equal(resolveSlutAction('besar')?.code, 'kiss');
assert.equal(resolveSlutAction('trio'), null);
assert.equal(resolveSlutAction('orgia'), null);

const schema = readFileSync('database/schema.sql', 'utf8');
for (const table of [
    'user_product_entitlements', 'roleplay_roles', 'roleplay_sessions',
    'roleplay_contracts', 'roleplay_charge_events', 'roleplay_action_messages',
]) assert.match(schema, new RegExp(`CREATE TABLE "[^"]+"\\."${table}"`));
assert.match(schema, /account_type.*in \('wallet', 'bank', 'reserve', 'escrow'\)/s);
assert.match(schema, /'role-slut', 'item', 'Licencia Slut'/);
assert.match(schema, /'slut', 'role-slut', 'Slut'.*1000, 1000, 10, 5/s);

const legacyFun = readFileSync('src/plugins/fun/fun-juegos.ts', 'utf8');
assert.doesNotMatch(legacyFun, /violar/);
assert.doesNotMatch(legacyFun, /replyActionTarget/);

console.log('roleplay-domain.test.ts OK');
