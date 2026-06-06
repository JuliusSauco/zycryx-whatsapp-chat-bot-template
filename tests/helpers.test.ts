import assert from 'node:assert/strict';
import {buildAliasMap, buildAliasRegex} from '../src/utils/command-alias.js';
import {pickRandom, randomChance, randomInt} from '../src/utils/random.js';
import {createUserRequestLocks} from '../src/lib/user-request-locks.js';
import {runFirstProvider} from '../src/lib/provider-fallback.js';
import {installLegacyArrayRandom} from '../src/lib/legacy-array-random.js';

function testRandomHelpers(): void {
    const values = ['a', 'b', 'c'] as const;
    assert.ok(values.includes(pickRandom(values)));

    for (let i = 0; i < 50; i++) {
        const zeroBased = randomInt(5);
        assert.ok(zeroBased >= 0 && zeroBased < 5);

        const ranged = randomInt(3, 7);
        assert.ok(ranged >= 3 && ranged <= 7);
    }

    assert.equal(randomChance(0), false);
    assert.equal(randomChance(1), true);
}

function testCommandAliases(): void {
    const play = {aliases: ['p', 'PlayAudio']};
    const menu = {aliases: ['help']};
    const aliasMap = buildAliasMap({play, menu});

    assert.equal(aliasMap.play, play);
    assert.equal(aliasMap.p, play);
    assert.equal(aliasMap.playaudio, play);
    assert.equal(aliasMap.help, menu);

    const regex = buildAliasRegex(aliasMap);
    assert.equal(regex.test('PLAYAUDIO'), true);
    assert.equal(regex.test('missing'), false);
}

function testUserRequestLocks(): void {
    const locks = createUserRequestLocks<{active: boolean}>();

    assert.equal(locks.acquire('user-1', {active: true}), true);
    assert.equal(locks.acquire('user-1', {active: false}), false);
    assert.deepEqual(locks.get('user-1'), {active: true});
    assert.equal(locks.has('user-1'), true);

    locks.release('user-1');
    assert.equal(locks.has('user-1'), false);
}

async function testProviderFallback(): Promise<void> {
    const calls: string[] = [];
    const result = await runFirstProvider([
        {
            name: 'empty',
            run: async () => {
                calls.push('empty');
                return null;
            },
        },
        {
            name: 'ok',
            run: async () => {
                calls.push('ok');
                return 'done';
            },
        },
    ], 'no provider');

    assert.equal(result, 'done');
    assert.deepEqual(calls, ['empty', 'ok']);

    await assert.rejects(
        () => runFirstProvider([{name: 'empty', run: async () => undefined}], 'no provider'),
        /no provider/,
    );
}

function testLegacyArrayRandom(): void {
    installLegacyArrayRandom();
    const value = [1, 2, 3].getRandom();
    assert.ok([1, 2, 3].includes(value));
}

testRandomHelpers();
testCommandAliases();
testUserRequestLocks();
await testProviderFallback();
testLegacyArrayRandom();

console.log('helpers.test.ts OK');
