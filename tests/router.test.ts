import assert from 'node:assert/strict';
import {definePlugin} from '../src/core/define-plugin.js';
import {CommandRouter} from '../src/core/router.js';
import type {Plugin} from '../src/types/plugin.js';

function plugin(name: string, options: Partial<Plugin> = {}): Plugin {
    const item = definePlugin({
        ...options,
        async execute() {
            return name;
        },
    });
    item.__name = name;
    return item;
}

function assertResolved(router: CommandRouter, command: string, rawText: string, hasPrefix: boolean, expected: Plugin | null): void {
    assert.equal(router.resolve(command, rawText, hasPrefix), expected);
}

function testExactAndArrayCommands(): void {
    const ping = plugin('ping', {command: 'Ping'});
    const play = plugin('play', {command: ['play', 'p', 'PlayAudio']});
    const router = new CommandRouter();

    router.registerAll({ping, play});

    assertResolved(router, 'ping', '/ping', true, ping);
    assertResolved(router, 'p', '/p song', true, play);
    assertResolved(router, 'playaudio', '/PlayAudio song', true, play);
    assertResolved(router, 'ping', 'ping', false, null);
}

function testRegexCommands(): void {
    const game = plugin('game', {command: /^(slot|cf)$/i});
    const globalRegex = plugin('globalRegex', {command: /^again$/gi});
    const router = new CommandRouter();

    router.registerAll({game, globalRegex});

    assertResolved(router, 'slot', '/slot', true, game);
    assertResolved(router, 'cf', '/cf', true, game);
    assertResolved(router, 'missing', '/missing', true, null);
    assertResolved(router, 'slot', 'slot', false, null);

    assertResolved(router, 'again', '/again', true, globalRegex);
    assertResolved(router, 'again', '/again', true, globalRegex);
}

function testCustomPrefix(): void {
    const evalPlugin = plugin('eval', {customPrefix: /^=>\s+/g});
    const functionPrefix = plugin('functionPrefix', {
        customPrefix: input => input.startsWith('$'),
    });
    const router = new CommandRouter();

    router.registerAll({evalPlugin, functionPrefix});

    assertResolved(router, '', '=> 1 + 1', false, evalPlugin);
    assertResolved(router, '', '=> 1 + 1', false, evalPlugin);
    assertResolved(router, '', '$status', false, functionPrefix);
    assertResolved(router, 'ping', '/ping', true, null);
}

function testBeforeHooks(): void {
    const plainBefore = plugin('plainBefore', {
        before: async () => undefined,
    });
    const commandBefore = plugin('commandBefore', {
        before: async () => undefined,
        runBeforeOnCommand: true,
    });
    const noBefore = plugin('noBefore', {command: 'ping'});
    const router = new CommandRouter();

    router.registerAll({plainBefore, commandBefore, noBefore});

    assert.deepEqual(router.getBeforePlugins(), [plainBefore, commandBefore]);
    assert.deepEqual(router.getBeforePluginsFor(false), [plainBefore, commandBefore]);
    assert.deepEqual(router.getBeforePluginsFor(true), [commandBefore]);
}

function testRegisterAllClearsPreviousState(): void {
    const first = plugin('first', {command: 'first'});
    const before = plugin('before', {before: async () => undefined});
    const second = plugin('second', {command: 'second'});
    const router = new CommandRouter();

    router.registerAll({first, before});
    assertResolved(router, 'first', '/first', true, first);
    assert.equal(router.getBeforePlugins().length, 1);

    router.registerAll({second});
    assertResolved(router, 'first', '/first', true, null);
    assertResolved(router, 'second', '/second', true, second);
    assert.equal(router.getBeforePlugins().length, 0);
}

testExactAndArrayCommands();
testRegexCommands();
testCustomPrefix();
testBeforeHooks();
testRegisterAllClearsPreviousState();

console.log('router.test.ts OK');
