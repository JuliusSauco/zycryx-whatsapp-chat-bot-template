import assert from 'node:assert/strict';
import {createCooldownStore, createExpiringMap, createPendingActionStore} from '../src/lib/ephemeral-state.js';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testExpiringMap(): Promise<void> {
    const expired: Array<{key: string; value: string}> = [];
    const store = createExpiringMap<string>({
        ttlMs: 20,
        onExpire: (key, value) => {
            expired.push({key, value});
        },
    });

    store.set('a', 'one');
    assert.equal(store.get('a'), 'one');
    assert.equal(store.has('a'), true);
    assert.equal(store.size(), 1);
    assert.equal(store.remainingMs('a') > 0, true);
    assert.deepEqual(store.entries(), [['a', 'one']]);
    assert.deepEqual(store.values(), ['one']);

    await sleep(35);
    assert.equal(store.get('a'), undefined);
    assert.deepEqual(expired, [{key: 'a', value: 'one'}]);

    store.set('b', 'two', 100);
    assert.equal(store.delete('b'), true);
    assert.equal(store.has('b'), false);
    assert.deepEqual(expired, [{key: 'a', value: 'one'}]);
}

async function testCooldownStore(): Promise<void> {
    const cooldown = createCooldownStore({ttlMs: 30});
    assert.deepEqual(cooldown.check('u1'), {allowed: true});
    cooldown.touch('u1');
    const blocked = cooldown.check('u1');
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) assert.equal(blocked.remainingMs > 0, true);
    cooldown.reset('u1');
    assert.deepEqual(cooldown.check('u1'), {allowed: true});
}

async function testPendingActionStore(): Promise<void> {
    const pending = createPendingActionStore<{amount: number}>({ttlMs: 20});
    pending.start('u1', {amount: 5});
    assert.deepEqual(pending.get('u1'), {amount: 5});
    assert.deepEqual(pending.consume('u1'), {amount: 5});
    assert.equal(pending.get('u1'), undefined);

    pending.start('u2', {amount: 9});
    await sleep(35);
    assert.equal(pending.get('u2'), undefined);
}

await testExpiringMap();
await testCooldownStore();
await testPendingActionStore();

console.log('ephemeral-state.test.ts OK');
