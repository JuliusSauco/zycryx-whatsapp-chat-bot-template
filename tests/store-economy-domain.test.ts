import assert from 'node:assert/strict';
import {
    getSecurityDailyPrice, getSecurityPreviewLevels, getSecurityRemainingFactor,
    MAX_RAFFLE_TICKETS_PER_USER, raffleTicketUnitPrice,
} from '../src/domain/store.js';
import {calculateDailyReward} from '../src/domain/daily-rewards.js';
import {getBogotaReminderWindow} from '../src/domain/daily-reminders.js';
import {applyRobberyProtection, getMaxRobAmount} from '../src/domain/robbery.js';

assert.equal(getSecurityDailyPrice(1), 10);
assert.equal(getSecurityDailyPrice(100), 1_000);
assert.ok(Math.abs(getSecurityRemainingFactor(1) - 0.9) < Number.EPSILON);
assert.equal(getSecurityRemainingFactor(100), 0);
assert.deepEqual(getSecurityPreviewLevels(0), [1, 2, 3, 4, 5]);
assert.deepEqual(getSecurityPreviewLevels(21), [22, 23, 24, 25, 26]);
assert.equal(raffleTicketUnitPrice('coins'), 100);
assert.equal(raffleTicketUnitPrice('limite'), 10);
assert.equal(MAX_RAFFLE_TICKETS_PER_USER, 5);

assert.deepEqual(calculateDailyReward(1), {
    baseExp: 1_000, bonusExp: 0, limits: 0, coins: 0, nextBaseExp: 2_000, hasBonus: false,
});
assert.deepEqual(calculateDailyReward(10), {
    baseExp: 10_000, bonusExp: 10_000, limits: 10, coins: 5_000, nextBaseExp: 11_000, hasBonus: true,
});
assert.equal(calculateDailyReward(500).baseExp, 500_000);
assert.equal(calculateDailyReward(500).bonusExp, 10_000);

assert.equal(getMaxRobAmount(1, 1), 1_000);
assert.equal(getMaxRobAmount(1, 100), 10);
assert.equal(getMaxRobAmount(1, 1_000), 1);
assert.equal(getMaxRobAmount(9, 10_000), 0);
assert.equal(getMaxRobAmount(10, 10_000), 1);
assert.equal(applyRobberyProtection(100, 1, 'wallet', 1), 90);
assert.equal(applyRobberyProtection(100, 100, 'wallet', 0), 0);
assert.equal(applyRobberyProtection(100, 0, 'bank', 1), 50);

assert.equal(getBogotaReminderWindow(new Date('2026-08-18T12:59:00Z')).shouldRun, false);
assert.deepEqual(getBogotaReminderWindow(new Date('2026-08-18T13:00:00Z')), {
    activityDay: '2026-08-18', shouldRun: true,
});
assert.equal(getBogotaReminderWindow(new Date('2026-08-18T15:00:00Z')).shouldRun, false);

console.log('store-economy-domain.test.ts OK');
