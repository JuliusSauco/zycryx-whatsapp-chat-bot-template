import assert from 'node:assert/strict';
import {
    limitOutput,
    sanitizeCommandError,
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

testLimitOutput();
testSanitizeCommandError();

console.log('sensitive-command.test.ts OK');
