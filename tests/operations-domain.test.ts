import assert from 'node:assert/strict';
import {mapChatMemoryRecord, mapExpirableChatMemory} from '../src/adapters/drizzle/chat-memory.mapper.js';
import {DEFAULT_IA_PROMPT, normalizeAiHistory} from '../src/domain/operations.js';

{
    const history = normalizeAiHistory([
        {role: 'system', content: 'base'},
        {role: 'user', content: 'hola'},
        {role: 'bad', content: 'x'},
        {role: 'assistant', content: 123},
        null,
    ]);

    assert.deepEqual(history, [
        {role: 'system', content: 'base'},
        {role: 'user', content: 'hola'},
    ]);
}

{
    assert.equal(typeof DEFAULT_IA_PROMPT, 'string');
    assert.ok(DEFAULT_IA_PROMPT.length > 20);
}

{
    const expirable = mapExpirableChatMemory({
        chat_id: 'group@g.us',
        updated_at: null,
        memory_ttl: null,
    });

    assert.equal(expirable.chat_id, 'group@g.us');
    assert.equal(expirable.updated_at.getTime(), 0);
    assert.equal(expirable.memory_ttl, 86400);
}

{
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    assert.deepEqual(mapChatMemoryRecord({history: [{role: 'user', content: 'hola'}], updated_at: updatedAt}), {
        history: [{role: 'user', content: 'hola'}],
        updated_at: updatedAt,
    });
}

console.log('operations-domain.test.ts OK');
