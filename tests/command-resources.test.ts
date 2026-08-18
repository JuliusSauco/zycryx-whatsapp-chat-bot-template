import assert from 'node:assert/strict';
import {repositories} from '../src/services/data-source.js';
import {
    checkCommandResources,
    commandResourceChargeMessage,
    reserveCommandResources,
} from '../src/services/resource.service.js';
import type {Plugin} from '../src/types/plugin.js';
import {normalizeCommandResourcePolicy, selectCommandPayment} from '../src/domain/command-resources.js';

const originalUsers = repositories.users;
const originalCommandResources = repositories.commandResources;
const reserveInputs: Array<{id: string}> = [];
let availableResources = {limite: 5, coins: 10, level: 3};

repositories.users = {
    ...originalUsers,
    getResources: async () => availableResources,
};
repositories.commandResources = {
    async reserve(input) {
        reserveInputs.push({id: input.id});
        return {
            kind: 'reserved',
            duplicate: false,
            reservation: {
                id: input.id, userId: input.userId, pluginId: input.pluginId, messageId: input.messageId,
                limitAmount: input.limit, coinsAmount: input.coins, alternativeCoinsAmount: input.alternativeCoins,
                paymentResource: input.limit && input.coins ? 'mixed' : input.limit ? 'limite' : input.coins ? 'coins' : 'none',
                requiredLevel: input.level,
                status: 'pending', releaseReason: null, createdAt: new Date(), updatedAt: new Date(), expiresAt: input.expiresAt,
            },
        };
    },
    async commit() { return null; },
    async release() { return null; },
    async releaseExpired() { return 0; },
};

try {
    const affordable = {limit: 2, coins: 4, level: 3} as Plugin;
    assert.equal(await checkCommandResources('user', affordable), null);
    assert.match(String(await checkCommandResources('user', {level: 4} as Plugin)), /4/);
    assert.match(String(await checkCommandResources('user', {limit: 6} as Plugin)), /#buy/);
    assert.match(String(await checkCommandResources('user', {coins: 11} as Plugin)), /COINS/);

    const alternative = {limit: 4, alternativeCoins: 40, level: 1} as Plugin;
    const alternativePolicy = normalizeCommandResourcePolicy(alternative);
    assert.deepEqual(selectCommandPayment(alternativePolicy, {limite: 4, coins: 40}), {
        limitAmount: 4, coinsAmount: 0, paymentResource: 'limite',
    });
    assert.deepEqual(selectCommandPayment(alternativePolicy, {limite: 3, coins: 40}), {
        limitAmount: 0, coinsAmount: 40, paymentResource: 'coins',
    });
    assert.equal(selectCommandPayment(alternativePolicy, {limite: 3, coins: 39}), null);
    availableResources = {limite: 4, coins: 40, level: 3};
    assert.equal(await checkCommandResources('user', alternative), null, 'limits must have priority when both balances suffice');
    availableResources = {limite: 3, coins: 40, level: 3};
    assert.equal(await checkCommandResources('user', alternative), null, 'Coins must cover the complete fallback price');
    availableResources = {limite: 3, coins: 39, level: 3};
    const combinedError = String(await checkCommandResources('user', alternative));
    assert.match(combinedError, /4 Límites/);
    assert.match(combinedError, /40 Coins/);
    availableResources = {limite: 3, coins: 39, level: 3};
    assert.notEqual(await checkCommandResources('user', alternative), null, 'partial balances must never be combined');
    availableResources = {limite: 5, coins: 10, level: 3};

    const first = await reserveCommandResources({sender: 'user', plugin: affordable, pluginId: 'plugin', messageId: 'message'});
    const second = await reserveCommandResources({sender: 'user', plugin: affordable, pluginId: 'plugin', messageId: 'message'});
    assert.equal(reserveInputs[0]?.id, reserveInputs[1]?.id, 'reservation IDs must be idempotent');
    assert.equal(first.kind, 'reserved');
    assert.equal(second.kind, 'reserved');
    if (first.kind === 'reserved') assert.match(String(commandResourceChargeMessage(first.reservation)), /2 Límites.*4 Coins/);
} finally {
    repositories.users = originalUsers;
    repositories.commandResources = originalCommandResources;
}

console.log('command-resources.test.ts OK');
