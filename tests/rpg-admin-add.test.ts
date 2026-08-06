import assert from 'node:assert/strict';
import {parseResourceAmount} from '../src/plugins/economy/economy-wallet-adjustment.helpers.js';

assert.equal(parseResourceAmount(['@573001234567', '100']), 100);
assert.equal(parseResourceAmount(['100']), 100);
assert.equal(parseResourceAmount(['@573001234567']), null);
assert.equal(parseResourceAmount(['@573001234567', '0']), null);
assert.equal(parseResourceAmount(['@573001234567', '1000000001']), null);

console.log('rpg-admin-add.test.ts OK');
