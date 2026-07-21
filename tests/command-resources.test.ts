import assert from 'node:assert/strict';
import {repositories} from '../src/services/data-source.js';
import {
    checkCommandResources,
    commandResourceChargeMessage,
    reserveCommandResources,
} from '../src/services/resource.service.js';
import type {Plugin} from '../src/types/plugin.js';

const originalUsers = repositories.users;
const originalCommandResources = repositories.commandResources;
const reserveInputs: Array<{id: string}> = [];

repositories.users = {
    ...originalUsers,
    getResources: async () => ({limite: 5, money: 10, level: 3}),
};
repositories.commandResources = {
    async reserve(input) {
        reserveInputs.push({id: input.id});
        return {
            kind: 'reserved',
            duplicate: false,
            reservation: {
                id: input.id, userId: input.userId, pluginId: input.pluginId, messageId: input.messageId,
                limitAmount: input.limit, moneyAmount: input.money, requiredLevel: input.level,
                status: 'pending', releaseReason: null, createdAt: new Date(), updatedAt: new Date(), expiresAt: input.expiresAt,
            },
        };
    },
    async commit() { return null; },
    async release() { return null; },
    async releaseExpired() { return 0; },
};

try {
    const affordable = {limit: 2, money: 4, level: 3} as Plugin;
    assert.equal(await checkCommandResources('user', affordable), null);
    assert.match(String(await checkCommandResources('user', {level: 4} as Plugin)), /4/);
    assert.match(String(await checkCommandResources('user', {limit: 6} as Plugin)), /#buy/);
    assert.match(String(await checkCommandResources('user', {money: 11} as Plugin)), /LOLICOINS/);

    const first = await reserveCommandResources({sender: 'user', plugin: affordable, pluginId: 'plugin', messageId: 'message'});
    const second = await reserveCommandResources({sender: 'user', plugin: affordable, pluginId: 'plugin', messageId: 'message'});
    assert.equal(reserveInputs[0]?.id, reserveInputs[1]?.id, 'reservation IDs must be idempotent');
    assert.equal(first.kind, 'reserved');
    assert.equal(second.kind, 'reserved');
    if (first.kind === 'reserved') assert.match(String(commandResourceChargeMessage(first.reservation)), /2 diamantes.*4 LoliCoins/);
} finally {
    repositories.users = originalUsers;
    repositories.commandResources = originalCommandResources;
}

console.log('command-resources.test.ts OK');
