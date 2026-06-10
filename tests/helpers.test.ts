import assert from 'node:assert/strict';
import {buildAliasMap, buildAliasRegex} from '../src/utils/command-alias.js';
import {normalizeFixedOwnerId} from '../src/utils/constants.js';
import {pickRandom, randomChance, randomInt} from '../src/utils/random.js';
import {createUserRequestLocks} from '../src/lib/user-request-locks.js';
import {runFirstProvider} from '../src/lib/provider-fallback.js';
import {installLegacyArrayRandom} from '../src/lib/legacy-array-random.js';
import {getMessage, getMessageList, renderMessage, renderTemplate} from '../src/services/content.service.js';
import {createPluginSdk} from '../src/core/plugin-sdk.js';
import type {PluginContext} from '../src/types/context.js';
import type {BotMessage} from '../src/types/message.js';

function testRandomHelpers(): void {
    const values = ['a', 'b', 'c'] as const;
    assert.ok(values.includes(pickRandom(values)));

    for (let i = 0; i < 50; i++) {
        const zeroBased = randomInt(5);
        assert.ok(zeroBased >= 0 && zeroBased < 5);

        const ranged = randomInt(3, 7);
        assert.ok(ranged >= 3 && ranged <= 7);
    }

    assert.equal(randomChance(0), false);
    assert.equal(randomChance(1), true);
}

function testCommandAliases(): void {
    const play = {aliases: ['p', 'PlayAudio']};
    const menu = {aliases: ['help']};
    const aliasMap = buildAliasMap({play, menu});

    assert.equal(aliasMap.play, play);
    assert.equal(aliasMap.p, play);
    assert.equal(aliasMap.playaudio, play);
    assert.equal(aliasMap.help, menu);

    const regex = buildAliasRegex(aliasMap);
    assert.equal(regex.test('PLAYAUDIO'), true);
    assert.equal(regex.test('missing'), false);
}

function testFixedOwnerNormalization(): void {
    assert.equal(normalizeFixedOwnerId('573001112233'), '573001112233@s.whatsapp.net');
    assert.equal(normalizeFixedOwnerId('+57 300 111 2233'), '573001112233@s.whatsapp.net');
    assert.equal(normalizeFixedOwnerId('573001112233@s.whatsapp.net'), '573001112233@s.whatsapp.net');
    assert.equal(normalizeFixedOwnerId('573001112233:1@s.whatsapp.net'), '573001112233@s.whatsapp.net');
    assert.equal(normalizeFixedOwnerId(''), null);
}

function testUserRequestLocks(): void {
    const locks = createUserRequestLocks<{active: boolean}>();

    assert.equal(locks.acquire('user-1', {active: true}), true);
    assert.equal(locks.acquire('user-1', {active: false}), false);
    assert.deepEqual(locks.get('user-1'), {active: true});
    assert.equal(locks.has('user-1'), true);

    locks.release('user-1');
    assert.equal(locks.has('user-1'), false);
}

async function testProviderFallback(): Promise<void> {
    const calls: string[] = [];
    const result = await runFirstProvider([
        {
            name: 'empty',
            run: async () => {
                calls.push('empty');
                return null;
            },
        },
        {
            name: 'ok',
            run: async () => {
                calls.push('ok');
                return 'done';
            },
        },
    ], 'no provider');

    assert.equal(result, 'done');
    assert.deepEqual(calls, ['empty', 'ok']);

    await assert.rejects(
        () => runFirstProvider([{name: 'empty', run: async () => undefined}], 'no provider'),
        /no provider/,
    );
}

function testLegacyArrayRandom(): void {
    installLegacyArrayRandom();
    const value = [1, 2, 3].getRandom();
    assert.ok([1, 2, 3].includes(value));
}

function testContentService(): void {
    assert.equal(renderTemplate('Hola {name}', {name: 'Julius'}), 'Hola Julius');
    assert.equal(renderTemplate('Hola {name}', {}), 'Hola {name}');
    assert.equal(getMessage('tools.screenshot.caption'), '✅');
    assert.ok(getMessageList('fun.games.personalityOptions.percentages').length > 0);
    assert.equal(
        renderMessage('tools.base64.usage', {command: '/tobase64'}),
        '/tobase64 texto',
    );
}

async function testPluginSdk(): Promise<void> {
    const replies: string[] = [];
    const sent: unknown[] = [];
    const m = {
        chat: 'chat-1',
        sender: 'user-1@s.whatsapp.net',
        reply: async (text: string) => {
            replies.push(text);
            return {} as never;
        },
        react: async (emoji: string) => {
            replies.push(`react:${emoji}`);
        },
    } as unknown as BotMessage;
    const ctx = {
        conn: {
            sendMessage: async (_jid: string, content: unknown) => {
                sent.push(content);
                return {} as never;
            },
            sendFile: async () => ({} as never),
        },
        text: '',
        args: [],
        usedPrefix: '/',
        command: 'tobase64',
        participants: [],
        metadata: {participants: []},
        isOwner: false,
        isROwner: false,
        isAdmin: false,
        isBotAdmin: false,
        isGroup: false,
        chatId: 'chat-1',
        sender: 'user-1@s.whatsapp.net',
        groupSettings: {},
    } as unknown as PluginContext;

    const sdk = createPluginSdk(m, ctx);
    await sdk.reply.message('tools.base64.usage', {command: '/tobase64'});
    assert.equal(replies[0], '/tobase64 texto');

    const locks = sdk.createUserLocks();
    assert.equal(locks.acquire('user-1'), true);
    assert.equal(locks.acquire('user-1'), false);

    await sdk.sendMessage({text: 'hola'});
    assert.deepEqual(sent[0], {text: 'hola'});
}

testRandomHelpers();
testCommandAliases();
testFixedOwnerNormalization();
testUserRequestLocks();
await testProviderFallback();
testLegacyArrayRandom();
testContentService();
await testPluginSdk();

console.log('helpers.test.ts OK');
