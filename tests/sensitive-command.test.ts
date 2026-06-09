import assert from 'node:assert/strict';
import {
    getExecOutput,
    limitOutput,
    sanitizeCommandError,
    withTimeout,
} from '../src/lib/sensitive-command.js';

function testLimitOutput(): void {
    assert.equal(limitOutput('abc', 10), 'abc');
    const limited = limitOutput('abcdefghij', 4);
    assert.equal(limited.includes('abcd'), true);
    assert.equal(limited.includes('salida truncada'), true);
}

function testSanitizeCommandError(): void {
    assert.equal(sanitizeCommandError(new Error('Command failed: test timed out')), 'El comando excedió el tiempo máximo permitido.');
    assert.equal(sanitizeCommandError(new Error('stdout maxBuffer length exceeded')), 'La salida del comando excedió el tamaño máximo permitido.');
    assert.equal(sanitizeCommandError('raw error'), 'raw error');
}

function testExecOutputExtraction(): void {
    const output = getExecOutput({stdout: 'out', stderr: 'err'});
    assert.deepEqual(output, {stdout: 'out', stderr: 'err'});
    assert.deepEqual(getExecOutput(new Error('x')), {stdout: '', stderr: ''});
}

async function testWithTimeout(): Promise<void> {
    assert.equal(await withTimeout(Promise.resolve('ok'), 100), 'ok');
    await assert.rejects(
        () => withTimeout(new Promise(resolve => setTimeout(resolve, 50)), 1, 'demo'),
        /demo excedió/,
    );
}

testLimitOutput();
testSanitizeCommandError();
testExecOutputExtraction();
await testWithTimeout();

console.log('sensitive-command.test.ts OK');
