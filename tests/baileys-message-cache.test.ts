import assert from 'node:assert/strict';
import {BaileysMessageCache} from '../src/lib/baileys-message-cache.js';

const cache = new BaileysMessageCache(2, 60_000);
const first = {conversation: 'one'};
cache.set({remoteJid: 'chat', id: '1'}, first);
cache.set({remoteJid: 'chat', id: '2'}, {conversation: 'two'});
assert.equal(cache.get({remoteJid: 'chat', id: '1'}), first);

cache.set({remoteJid: 'chat', id: '3'}, {conversation: 'three'});
assert.equal(cache.get({remoteJid: 'chat', id: '1'}), undefined, 'Debe expulsar la entrada más antigua.');
assert.equal(cache.get({remoteJid: 'chat', id: '3'})?.conversation, 'three');

cache.clear();
assert.equal(cache.get({remoteJid: 'chat', id: '3'}), undefined);

console.log('baileys-message-cache.test.ts OK');
