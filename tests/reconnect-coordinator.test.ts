import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ReconnectCoordinator} from '../src/core/reconnect-coordinator.js';

const coordinator = new ReconnectCoordinator({baseDelayMs: 1_000, maxDelayMs: 8_000, jitterRatio: 0.2, random: () => 0.5});
assert.equal(coordinator.delayForAttempt(0), 1_000);
assert.equal(coordinator.delayForAttempt(1), 2_000);
assert.equal(coordinator.delayForAttempt(4), 8_000);

const jittered = new ReconnectCoordinator({baseDelayMs: 1_000, jitterRatio: 0.2, random: () => 1});
assert.equal(jittered.delayForAttempt(0), 1_200);

const noWait = new ReconnectCoordinator({baseDelayMs: 1, jitterRatio: 0, random: () => 0.5});
let calls = 0;
assert.equal(noWait.schedule('main', async () => { calls++; }), true);
assert.equal(noWait.schedule('main', async () => { calls++; }), false);
await new Promise(resolve => setTimeout(resolve, 20));
assert.equal(calls, 1);
noWait.stop();

const mainSource = readFileSync('src/core/main.ts', 'utf8');
assert.match(mainSource, /err instanceof BaileysAuthLeaseConflictError/);
assert.match(mainSource, /mainReconnect\.schedule\('main', startBot\)/);
assert.match(
    mainSource,
    /if \(!state\.creds\.registered && !linkRequest\) \{\s*await authState\.dispose\(\);[\s\S]*?Sesión principal incompleta conservada/,
    'an incomplete main session must release its lease without deleting stored credentials',
);
assert.match(mainSource, /!state\.creds\.registered[\s\S]*?hasStoredConnectedIdentity\('main'\)[\s\S]*?saveCreds\(\{registered: true}\)/);
const authSource = readFileSync('src/services/baileys-auth-state.service.ts', 'utf8');
assert.match(authSource, /throw new BaileysAuthLeaseConflictError\(input\.sessionId\)/);
assert.match(authSource, /if \(update\) Object\.assign\(credentials, update\)/);
assert.match(authSource, /cloneCredentials\(this\.getCredentials\(\)\)/);

console.log('reconnect-coordinator.test.ts OK');
