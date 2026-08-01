import assert from 'node:assert/strict';
import {
    getMaxRobExp,
    getRandomRobExp,
    getRequiredRobLevel,
    isValidRobAmount,
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
