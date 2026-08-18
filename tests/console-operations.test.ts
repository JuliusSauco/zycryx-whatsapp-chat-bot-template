import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    getConsoleOperationState,
    registerConsoleOperationHandler,
    runConsoleOperation,
} from '../src/core/console-operations.js';

let releaseStop: (() => void) | undefined;
registerConsoleOperationHandler(async action => {
    if (action === 'stop-bot') {
        await new Promise<void>(resolve => { releaseStop = resolve; });
        return {message: 'detenido', mainStopped: true};
    }
    return {
        message: 'limpio',
        mainStopped: false,
        reset: {users: 13, groupSettings: 4, chats: 5, chatMemories: 2},
    };
});

const stop = runConsoleOperation('stop-bot');
assert.equal(getConsoleOperationState().phase, 'running');
await assert.rejects(() => runConsoleOperation('restart-bot'), /operación administrativa en curso/);
releaseStop?.();
assert.deepEqual(await stop, {message: 'detenido', mainStopped: true});
assert.equal(getConsoleOperationState().mainStopped, true);

await runConsoleOperation('clear-data');
const completed = getConsoleOperationState();
assert.equal(completed.phase, 'success');
assert.equal(completed.mainStopped, false);
assert.equal(completed.reset?.users, 13);

const databaseSource = readFileSync('src/adapters/drizzle/database.repository.ts', 'utf8');
const resetBlock = databaseSource.match(/async resetSyncedData\(\) \{[\s\S]*?\n    \},\n\};/)?.[0] || '';
for (const table of ['bot_identity.users', 'bot_groups.group_settings', 'bot_groups.chats', 'bot_ai.chat_memory']) {
    assert.match(resetBlock, new RegExp(table.replace('.', '\\.')));
}
assert.match(resetBlock, /DELETE FROM bot_identity\.users/);
assert.doesNotMatch(resetBlock, /TRUNCATE|bot_sessions/, 'data cleanup must work with runtime DELETE grants and never touch WhatsApp sessions');

const mainSource = readFileSync('src/core/main.ts', 'utf8');
const stopBlock = mainSource.match(/async function stopMainBotPreservingSession[\s\S]*?\n}\n/)?.[0] || '';
assert.match(stopBlock, /disposeStoredAuthSession\('main'\)/);
assert.doesNotMatch(stopBlock, /deleteMainSessionStorage|deleteStoredAuthSession|logout\(/);
assert.match(mainSource, /if \(mainBotManuallyStopped\)[\s\S]*?Usa Iniciar \/ reiniciar bot/);

const healthSource = readFileSync('src/core/health-server.ts', 'utf8');
for (const phrase of ['LIMPIAR DATOS', 'DETENER BOT', 'REINICIAR BOT', 'BORRAR SESION']) {
    assert.match(healthSource, new RegExp(phrase));
}
assert.match(healthSource, /body\.confirmation !== expected/);

const html = readFileSync('resources/web-console/index.html', 'utf8');
const frontend = readFileSync('resources/web-console/app.js', 'utf8');
for (const action of ['clear-data', 'stop-bot', 'restart-bot', 'delete-session']) {
    assert.match(html, new RegExp(`data-operation="${action}"`));
}
assert.match(frontend, /api\/console\/operations\/\$\{action}/);
assert.match(frontend, /window\.prompt/);

console.log('console-operations.test.ts OK');
