import assert from 'node:assert/strict';
import {executePluginWithTimeout, PluginTimeoutError} from '../src/core/plugin-execution.js';
import {runPluginInterceptors} from '../src/core/plugin-interceptors.js';
import {definePlugin} from '../src/core/define-plugin.js';
import {createPluginLocks} from '../src/lib/plugin-locks.js';

const baseContext = {
    conn: {}, isOwner: false, isAdmin: false, isBotAdmin: false, isGroup: false,
    chatId: 'chat', sender: 'user', participants: [], metadata: {}, botConfig: {},
    branding: {watermark: '', logoUrl: ''}, groupSettings: {},
} as never;
const message = {} as never;

const order: string[] = [];
const plugin = definePlugin({
    interceptors: [
        {phase: 'conversation', priority: 1, appliesTo: 'all', failurePolicy: 'fail-open', async run() { order.push('conversation'); return {kind: 'continue'}; }},
        {phase: 'security', priority: 1, appliesTo: 'all', failurePolicy: 'fail-closed', async run() { order.push('security'); return {kind: 'continue'}; }},
    ],
    async execute() {},
});
plugin.__name = 'pipeline';
await runPluginInterceptors({plugins: [plugin], message, context: baseContext, isCommand: false});
assert.deepEqual(order, ['security', 'conversation']);

const timeoutPlugin = definePlugin({executionPolicy: {timeoutMs: 5}, async execute() {}});
await assert.rejects(executePluginWithTimeout({
    plugin: timeoutPlugin,
    pluginId: 'timeout',
    controller: new AbortController(),
    execute: () => new Promise(resolve => setTimeout(resolve, 50)),
}), PluginTimeoutError);

const locksA = createPluginLocks('plugin');
const locksB = createPluginLocks('plugin');
let release!: () => void;
const blocker = new Promise<void>(resolve => { release = resolve; });
const running = locksA.runExclusive('user', async () => blocker);
assert.deepEqual(await locksB.runExclusive('user', async () => undefined), {acquired: false});
release();
assert.equal((await running).acquired, true);

console.log('plugin-pipeline.test.ts OK');
