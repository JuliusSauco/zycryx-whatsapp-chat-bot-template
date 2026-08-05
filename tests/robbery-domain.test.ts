import assert from 'node:assert/strict';
import {
    evaluateRobProgress,
    getMaxRobExp,
    getNextRobAvailability,
    getNextRobDayStart,
    getRandomRobExp,
    getRobCooldownMs,
    getRobDayKey,
    getRequiredRobLevel,
    isValidRobAmount,
    ROB_COOLDOWN_STEP_MS,
    ROB_DAILY_LIMIT,
} from '../src/domain/robbery.js';
import {parseRobAmount} from '../src/plugins/rpg/rpg-rob.js';

assert.equal(getMaxRobExp(0), 0);
assert.equal(getMaxRobExp(1), 1000);
assert.equal(getMaxRobExp(25), 25000);
assert.equal(getMaxRobExp(25.9), 25000);
assert.equal(getRequiredRobLevel(1), 1);
assert.equal(getRequiredRobLevel(1000), 1);
assert.equal(getRequiredRobLevel(1001), 2);
assert.equal(getRequiredRobLevel(2567), 3);

for (let attempt = 0; attempt < 100; attempt++) {
    const randomAmount = getRandomRobExp(26);
    assert.equal(Number.isInteger(randomAmount), true);
    assert.equal(randomAmount >= 1 && randomAmount <= 26000, true);
}
assert.equal(getRandomRobExp(0), 0);

const originalRandom = Math.random;
try {
    Math.random = () => 0;
    assert.equal(getRandomRobExp(26), 1);
    Math.random = () => 0.9999999999999999;
    assert.equal(getRandomRobExp(26), 26000);
} finally {
    Math.random = originalRandom;
}

assert.equal(isValidRobAmount(0), false);
assert.equal(isValidRobAmount(-1), false);
assert.equal(isValidRobAmount(2.5), false);
assert.equal(isValidRobAmount(2567), true);

assert.equal(ROB_DAILY_LIMIT, 4);
assert.equal(getRobCooldownMs(0), 0);
assert.equal(getRobCooldownMs(1), ROB_COOLDOWN_STEP_MS);
assert.equal(getRobCooldownMs(4), 4 * ROB_COOLDOWN_STEP_MS);
assert.equal(getRobCooldownMs(99), 4 * ROB_COOLDOWN_STEP_MS);

const colombiaMidnight = Date.parse('2026-08-05T05:00:00.000Z');
assert.equal(getRobDayKey(colombiaMidnight - 1), '2026-08-04');
assert.equal(getRobDayKey(colombiaMidnight), '2026-08-05');
assert.equal(getNextRobDayStart(colombiaMidnight), Date.parse('2026-08-06T05:00:00.000Z'));

const firstRobAt = Date.parse('2026-08-05T12:00:00.000Z');
assert.deepEqual(evaluateRobProgress({lastRobAt: 999, dailyCount: 0, dayKey: null}, firstRobAt), {
    kind: 'allowed',
    dailyCount: 0,
    dayKey: '2026-08-05',
});
assert.deepEqual(evaluateRobProgress({
    lastRobAt: firstRobAt,
    dailyCount: 1,
    dayKey: '2026-08-05',
}, firstRobAt + ROB_COOLDOWN_STEP_MS - 1), {kind: 'cooldown', remainingMs: 1});
assert.deepEqual(evaluateRobProgress({
    lastRobAt: firstRobAt,
    dailyCount: 1,
    dayKey: '2026-08-05',
}, firstRobAt + ROB_COOLDOWN_STEP_MS), {
    kind: 'allowed',
    dailyCount: 1,
    dayKey: '2026-08-05',
});

for (const dailyCount of [2, 3]) {
    const cooldownMs = dailyCount * ROB_COOLDOWN_STEP_MS;
    assert.deepEqual(evaluateRobProgress({
        lastRobAt: firstRobAt,
        dailyCount,
        dayKey: '2026-08-05',
    }, firstRobAt + cooldownMs - 1), {kind: 'cooldown', remainingMs: 1});
    assert.deepEqual(evaluateRobProgress({
        lastRobAt: firstRobAt,
        dailyCount,
        dayKey: '2026-08-05',
    }, firstRobAt + cooldownMs), {
        kind: 'allowed',
        dailyCount,
        dayKey: '2026-08-05',
    });
}

const fourthRobAt = Date.parse('2026-08-06T03:30:00.000Z');
assert.equal(getRobDayKey(fourthRobAt), '2026-08-05');
assert.equal(getNextRobAvailability(fourthRobAt, 4), Date.parse('2026-08-06T07:30:00.000Z'));
assert.deepEqual(evaluateRobProgress({
    lastRobAt: fourthRobAt,
    dailyCount: 4,
    dayKey: '2026-08-05',
}, Date.parse('2026-08-06T04:00:00.000Z')), {
    kind: 'daily_limit',
    remainingMs: 3.5 * ROB_COOLDOWN_STEP_MS,
    nextAvailableAt: Date.parse('2026-08-06T07:30:00.000Z'),
});
assert.deepEqual(evaluateRobProgress({
    lastRobAt: fourthRobAt,
    dailyCount: 4,
    dayKey: '2026-08-05',
}, Date.parse('2026-08-06T05:00:00.000Z')), {
    kind: 'cooldown',
    remainingMs: 2.5 * ROB_COOLDOWN_STEP_MS,
});
assert.deepEqual(evaluateRobProgress({
    lastRobAt: fourthRobAt,
    dailyCount: 4,
    dayKey: '2026-08-05',
}, Date.parse('2026-08-06T07:30:00.000Z')), {
    kind: 'allowed',
    dailyCount: 0,
    dayKey: '2026-08-06',
});

assert.deepEqual(parseRobAmount([]), {kind: 'automatic'});
assert.deepEqual(parseRobAmount(['--info']), {kind: 'info'});
assert.deepEqual(parseRobAmount(['@573001234567', '--INFO']), {kind: 'info'});
assert.deepEqual(parseRobAmount(['2567', '@573001234567', '--info']), {kind: 'info'});
assert.deepEqual(parseRobAmount(['@573001234567']), {kind: 'automatic'});
assert.deepEqual(parseRobAmount(['2567', '@573001234567']), {kind: 'explicit', amount: 2567});
assert.deepEqual(parseRobAmount(['@573001234567', '2567']), {kind: 'explicit', amount: 2567});
assert.deepEqual(parseRobAmount(['0', '@573001234567']), {kind: 'invalid'});
assert.deepEqual(parseRobAmount(['2.5', '@573001234567']), {kind: 'invalid'});
assert.deepEqual(parseRobAmount(['texto', '@573001234567']), {kind: 'invalid'});

console.log('robbery-domain.test.ts OK');
