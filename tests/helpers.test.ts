import assert from 'node:assert/strict';
import {mergeOwnerNumbers} from '../src/utils/owner-numbers.js';
import {buildAliasMap, buildAliasRegex} from '../src/utils/command-alias.js';
import {pickRandom, randomChance, randomInt} from '../src/utils/random.js';
import {createUserRequestLocks} from '../src/lib/user-request-locks.js';
import {runFirstProvider} from '../src/lib/provider-fallback.js';
import {installLegacyArrayRandom} from '../src/lib/legacy-array-random.js';
import {getMessage, getMessageList, renderMessage, renderTemplate} from '../src/services/content.service.js';
import {createPluginSdk} from '../src/core/plugin-sdk.js';
import type {PluginContext} from '../src/types/context.js';
import type {BotMessage} from '../src/types/message.js';
import type {ExtendedConn} from '../src/types/context.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';
import {replyActionTarget} from '../src/plugins/fun/fun-juegos.helpers.js';
import {resolveOgiTargets, selectRandomOgiTargets} from '../src/plugins/messages/msg-gif-ogi.js';
import {selectReactionMedia} from '../src/plugins/messages/gif-media.js';
import path from 'node:path';
import {getTargetJid, parseRoleInput} from '../src/plugins/group/grupo-setrole.js';

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

function testOwnerNumberMerge(): void {
    assert.deepEqual(
        mergeOwnerNumbers('573001112233,51999888777', '573001112233@s.whatsapp.net,+57 300 444 5566,573009998888:4@s.whatsapp.net'),
        [['573001112233'], ['51999888777'], ['573004445566'], ['573009998888']],
    );
}

function testSetRoleHelpers(): void {
    assert.equal(getTargetJid({mentionedJid: ['573001112233@s.whatsapp.net']}), '573001112233@s.whatsapp.net');
    assert.equal(getTargetJid({quoted: {sender: '573009998888:2@s.whatsapp.net'}}), '573009998888@s.whatsapp.net');
    assert.deepEqual(parseRoleInput('@573001112233 Moderador|Modera el grupo | turno noche'), {
        role: 'Moderador',
        roleDescription: 'Modera el grupo | turno noche',
    });
    assert.deepEqual(parseRoleInput('Administrador'), {role: 'Administrador', roleDescription: null});
    assert.equal(parseRoleInput('@573001112233'), null);
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

async function testActionTargetMentionResolution(): Promise<void> {
    let sentContent: Record<string, unknown> | undefined;
    let sentOptions: Record<string, unknown> | undefined;
    const lid = '123456789012345@lid';
    const phoneJid = '573001112233@s.whatsapp.net';
    const m = {
        chat: 'group@g.us',
        mentionedJid: [lid],
        reply: async () => ({} as never),
    } as unknown as BotMessage;
    const conn = {
        sendMessage: async (_chatId: string, message: Record<string, unknown>, options: Record<string, unknown>) => {
            sentContent = message;
            sentOptions = options;
            return {} as never;
        },
    } as unknown as ExtendedConn;
    const participants = [{id: lid, participantAlt: phoneJid}] as GroupParticipant[];

    await replyActionTarget(conn, m, 'follar', '@123456789012345', participants);

    assert.ok((sentContent?.text as string).includes('@573001112233'));
    assert.equal((sentContent?.text as string).includes('@123456789012345'), false);
    assert.deepEqual(sentContent?.mentions, [phoneJid]);
    assert.deepEqual(sentContent?.contextInfo, {mentionedJid: [phoneJid]});
    assert.equal(sentOptions?.quoted, m);
}

function testOgiTargetResolution(): void {
    const participants = [
        {id: 'sender-lid@lid', participantAlt: '573000000000@s.whatsapp.net'},
        {id: 'target-1@lid', participantAlt: '573000000001@s.whatsapp.net'},
        {id: 'target-2@lid', participantAlt: '573000000002@s.whatsapp.net'},
        {id: 'target-3@lid', participantAlt: '573000000003@s.whatsapp.net'},
        {id: 'target-4@lid', participantAlt: '573000000004@s.whatsapp.net'},
    ] as GroupParticipant[];

    const targets = resolveOgiTargets([
        'target-1@lid',
        '573000000001@s.whatsapp.net',
        'target-2@lid',
        'target-3@lid',
        'target-4@lid',
        'sender-lid@lid',
    ], 'sender-lid@lid', participants);

    assert.deepEqual(targets.map(target => target.mentionJid), [
        '573000000001@s.whatsapp.net',
        '573000000002@s.whatsapp.net',
        '573000000003@s.whatsapp.net',
        '573000000004@s.whatsapp.net',
    ]);

    const randomTargets = selectRandomOgiTargets(participants, 'sender-lid@lid', 3, () => 0);
    assert.equal(randomTargets.length, 3);
    assert.equal(randomTargets.some(target => target.mentionJid === '573000000000@s.whatsapp.net'), false);
    assert.equal(new Set(randomTargets.map(target => target.mentionJid)).size, 3);
}

function testReactionMediaFallback(): void {
    const root = path.resolve('resources/media/reaction-gifs');
    const trio = selectReactionMedia({
        publicFolder: path.join(root, 'tr'),
        nsfwFolder: path.join(root, 'tr', 'nsfw'),
        nsfwEnabled: false,
    });
    assert.equal(trio.fallbackReason, null);
    assert.match(trio.filePath || '', /reaction-gifs[\\/]tr[\\/]tr-1\.mp4$/);

    const dedeo = selectReactionMedia({
        publicFolder: path.join(root, 'dd'),
        nsfwFolder: path.join(root, 'dd', 'nsfw'),
        nsfwEnabled: false,
    });
    assert.equal(dedeo.fallbackReason, 'nsfw-required');
    assert.equal(dedeo.filePath, null);

    const deepthroat = selectReactionMedia({
        publicFolder: path.join(root, 'dt'),
        nsfwFolder: path.join(root, 'dt', 'nsfw'),
        nsfwEnabled: false,
    });
    assert.equal(deepthroat.fallbackReason, null);
    assert.ok(deepthroat.filePath?.includes(`${path.sep}dt${path.sep}`));
    assert.ok(!deepthroat.filePath?.includes(`${path.sep}nsfw${path.sep}`));

    const sixtyNine = selectReactionMedia({
        publicFolder: path.join(root, '69'),
        nsfwFolder: path.join(root, '69', 'nsfw'),
        nsfwEnabled: false,
    });
    assert.equal(sixtyNine.fallbackReason, 'nsfw-required');
    assert.equal(sixtyNine.filePath, null);

    const sixtyNineNsfw = selectReactionMedia({
        publicFolder: path.join(root, '69'),
        nsfwFolder: path.join(root, '69', 'nsfw'),
        nsfwEnabled: true,
    });
    assert.equal(sixtyNineNsfw.fallbackReason, null);
    assert.ok(sixtyNineNsfw.filePath?.includes(`${path.sep}69${path.sep}nsfw${path.sep}`));

    const espadasos = selectReactionMedia({
        publicFolder: path.join(root, 'espn'),
        nsfwFolder: path.join(root, 'espn', 'nsfw'),
        nsfwEnabled: false,
    });
    assert.equal(espadasos.fallbackReason, 'nsfw-required');
    assert.equal(espadasos.filePath, null);

    const espadasosNsfw = selectReactionMedia({
        publicFolder: path.join(root, 'espn'),
        nsfwFolder: path.join(root, 'espn', 'nsfw'),
        nsfwEnabled: true,
    });
    assert.equal(espadasosNsfw.fallbackReason, null);
    assert.ok(espadasosNsfw.filePath?.includes(`${path.sep}espn${path.sep}nsfw${path.sep}`));

    const titfuckPublic = selectReactionMedia({
        publicFolder: path.join(root, 'rs'),
        nsfwFolder: path.join(root, 'rs', 'nsfw'),
        nsfwEnabled: false,
    });
    assert.equal(titfuckPublic.fallbackReason, null);
    assert.ok(titfuckPublic.filePath?.includes(`${path.sep}rs${path.sep}`));
    assert.ok(!titfuckPublic.filePath?.includes(`${path.sep}nsfw${path.sep}`));

    const titfuckNsfw = selectReactionMedia({
        publicFolder: path.join(root, 'rs'),
        nsfwFolder: path.join(root, 'rs', 'nsfw'),
        nsfwEnabled: true,
    });
    assert.equal(titfuckNsfw.fallbackReason, null);
    assert.ok(titfuckNsfw.filePath?.includes(`${path.sep}rs${path.sep}nsfw${path.sep}`));

    const ogi = selectReactionMedia({
        publicFolder: path.join(root, 'ogi'),
        nsfwFolder: path.join(root, 'ogi', 'nsfw'),
        nsfwEnabled: true,
    });
    assert.equal(ogi.fallbackReason, null);
    assert.ok(ogi.filePath?.includes(`${path.sep}ogi${path.sep}nsfw${path.sep}`));
}

testRandomHelpers();
testCommandAliases();
testOwnerNumberMerge();
testSetRoleHelpers();
testUserRequestLocks();
await testProviderFallback();
testLegacyArrayRandom();
testContentService();
await testPluginSdk();
await testActionTargetMentionResolution();
testOgiTargetResolution();
testReactionMediaFallback();

console.log('helpers.test.ts OK');
