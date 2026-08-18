import assert from 'node:assert/strict';
import {mapSubbotConfig, type SubbotRow} from '../src/adapters/drizzle/subbot.mapper.js';
import {cleanSubbotId, DEFAULT_SUBBOT_CONFIG} from '../src/domain/subbots.js';

const subbotRow: SubbotRow = {
    id: 'bot@s.whatsapp.net',
    tipo: 'null',
    name: null,
    logoUrl: null,
    mode: 'public',
    antiPrivate: true,
    antiCall: false,
    privacy: false,
    prestar: false,
};

{
    const config = mapSubbotConfig(subbotRow, [], []);
    assert.equal(config.id, 'bot@s.whatsapp.net');
    assert.deepEqual(config.prefix, DEFAULT_SUBBOT_CONFIG.prefix);
    assert.equal(config.mode, 'public');
    assert.deepEqual(config.owners, []);
    assert.equal(config.anti_private, true);
    assert.equal(config.anti_call, false);
    assert.equal(config.privacy, false);
    assert.equal(config.prestar, false);
}

{
    assert.equal(cleanSubbotId('bot:12@s.whatsapp.net'), 'bot@s.whatsapp.net');
    assert.equal(cleanSubbotId('bot@s.whatsapp.net'), 'bot@s.whatsapp.net');
}

console.log('subbot-domain.test.ts OK');
