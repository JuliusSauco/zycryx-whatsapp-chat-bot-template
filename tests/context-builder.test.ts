import assert from 'node:assert/strict';
import {buildContext, groupMetaCache} from '../src/core/context-builder.js';
import {invalidateGroupSettings, invalidateSubbotConfig} from '../src/lib/db-cache.js';
import {repositories} from '../src/services/data-source.js';
import type {SubbotConfig} from '../src/types/config.js';
import type {ExtendedConn} from '../src/types/context.js';
import type {BotMessage} from '../src/types/message.js';

type Participant = {id: string; admin?: 'admin' | 'superadmin' | null};

type Calls = {
    groupMetadata: string[];
    updateTipo: Array<{botId: string; tipo: string}>;
    clearPrimaryBot: string[];
};

const originalSubbots = repositories.subbots;
const originalGroupSettings = repositories.groupSettings;

const defaultSettings = {
    banned: false,
    primary_bot: null,
    modoadmin: false,
    antifake: false,
    message_logging: false,
    antilink: false,
    antilink2: false,
    virusTotal: false,
    audios: false,
    autolevelup: true,
};

function setupGlobals(): void {
    globalThis.info = {
        ...(globalThis.info || {}),
        wm: 'BaseBot',
        img2: 'base-logo',
    };
    globalThis.owner = [['9999']];
}

function createSubbotConfig(overrides: Partial<SubbotConfig> = {}): SubbotConfig {
    return {
        prefix: ['/', '.'],
        mode: 'public',
        anti_private: true,
        anti_call: false,
        owners: [],
        name: null,
        logo_url: null,
        privacy: null,
        prestar: null,
        tipo: null,
        ...overrides,
    };
}

function installRepositoryMocks(calls: Calls, options: {
    subbotConfig?: SubbotConfig | null;
    groupSettings?: Partial<typeof defaultSettings> | null;
} = {}): void {
    repositories.subbots = {
        ...originalSubbots,
        findConfig: async () => options.subbotConfig ?? createSubbotConfig(),
        updateTipo: async (botId: string, tipo: string) => {
            calls.updateTipo.push({botId, tipo});
        },
    };

    repositories.groupSettings = {
        ...originalGroupSettings,
        findContextSettings: async () => options.groupSettings === null
            ? null
            : {...defaultSettings, ...(options.groupSettings || {})},
        clearPrimaryBot: async (chatId: string) => {
            calls.clearPrimaryBot.push(chatId);
        },
    };
}

function restoreRepositories(): void {
    repositories.subbots = originalSubbots;
    repositories.groupSettings = originalGroupSettings;
}

function createConn(calls: Calls, options: {
    botId?: string;
    botLid?: string;
    participants?: Participant[];
    cachedParticipants?: Participant[];
    isMain?: boolean;
} = {}): ExtendedConn {
    const botId = options.botId || '5555:1@s.whatsapp.net';
    const participants = options.participants || [];
    const groupCache = new Map<string, unknown>();
    if (options.cachedParticipants) {
        groupCache.set('group-1@g.us', {id: 'group-1@g.us', subject: 'Cached', participants: options.cachedParticipants});
    }

    const conn = {
        user: {
            id: botId,
            lid: options.botLid || '5555@lid',
        },
        groupCache,
        groupMetadata: async (chatId: string) => {
            calls.groupMetadata.push(chatId);
            return {id: chatId, subject: 'Fetched', participants};
        },
    } as unknown as ExtendedConn;

    if (options.isMain) globalThis.conn = conn;
    else globalThis.conn = {} as ExtendedConn;

    return conn;
}

function createMessage(overrides: Partial<BotMessage> = {}): BotMessage {
    return {
        key: {
            remoteJid: 'group-1@g.us',
            participant: '1111@s.whatsapp.net',
        },
        sender: '',
        chat: 'group-1@g.us',
        lid: '',
        user: {},
        isGroup: false,
        isAdmin: false,
        ...overrides,
    } as unknown as BotMessage;
}

async function withMocks<T>(options: Parameters<typeof installRepositoryMocks>[1], run: (calls: Calls) => Promise<T>): Promise<T> {
    const calls: Calls = {groupMetadata: [], updateTipo: [], clearPrimaryBot: []};
    groupMetaCache.clear();
    invalidateGroupSettings('group-1@g.us');
    invalidateSubbotConfig('5555@s.whatsapp.net');
    invalidateSubbotConfig('2222@s.whatsapp.net');
    invalidateSubbotConfig('3333@s.whatsapp.net');
    installRepositoryMocks(calls, options);
    try {
        return await run(calls);
    } finally {
        restoreRepositories();
        groupMetaCache.clear();
    }
}

async function testPrivateChatSenderAndOwnerResolution(): Promise<void> {
    await withMocks({
        subbotConfig: createSubbotConfig({
            owners: ['2222@s.whatsapp.net'],
            name: 'CustomBot',
            logo_url: 'custom-logo',
            tipo: 'subbot',
        }),
    }, async (calls) => {
        const conn = createConn(calls, {botId: '2222:7@s.whatsapp.net', isMain: true});
        const msg = createMessage({
            key: {remoteJid: '2222@s.whatsapp.net', remoteJidAlt: '2222@s.whatsapp.net'},
            chat: '2222@s.whatsapp.net',
        });

        const ctx = await buildContext(conn, msg);

        assert.equal(ctx.isGroup, false);
        assert.equal(ctx.sender, '2222@s.whatsapp.net');
        assert.equal(ctx.senderJid, '2222@s.whatsapp.net');
        assert.equal(ctx.isOwner, true);
        assert.equal(ctx.isCreator, false);
        assert.equal(ctx.botJid, '2222@s.whatsapp.net');
        assert.equal(ctx.shouldAbort, false);
        assert.equal(globalThis.info.wm, 'CustomBot');
        assert.equal(globalThis.info.img2, 'custom-logo');
        assert.deepEqual(calls.groupMetadata, []);
        assert.deepEqual(calls.updateTipo, [{botId: '2222@s.whatsapp.net', tipo: 'oficial'}]);
    });
}

async function testCreatorFromGlobalOwnerAndFromMeSender(): Promise<void> {
    await withMocks({
        subbotConfig: createSubbotConfig({tipo: 'oficial'}),
    }, async (calls) => {
        const conn = createConn(calls, {botId: '3333:1@s.whatsapp.net'});
        const msg = createMessage({
            key: {
                remoteJid: '9999@s.whatsapp.net',
                remoteJidAlt: '9999@s.whatsapp.net',
                fromMe: true,
            },
            chat: '9999@s.whatsapp.net',
        });

        const ctx = await buildContext(conn, msg);

        assert.equal(ctx.sender, '3333@s.whatsapp.net');
        assert.equal(ctx.senderJid, '3333@s.whatsapp.net');
        assert.equal(ctx.isOwner, true);
        assert.equal(ctx.botJid, '3333@s.whatsapp.net');
        assert.deepEqual(calls.updateTipo, [{botId: '3333@s.whatsapp.net', tipo: 'subbot'}]);
    });
}

async function testGroupMetadataAdminsAndCachedMetadata(): Promise<void> {
    await withMocks({
        subbotConfig: createSubbotConfig(),
        groupSettings: {modoadmin: true},
    }, async (calls) => {
        const conn = createConn(calls, {
            botId: '5555:1@s.whatsapp.net',
            botLid: '5555@lid',
            cachedParticipants: [
                {id: '1111@lid', admin: 'admin'},
                {id: '5555@s.whatsapp.net', admin: 'superadmin'},
            ],
        });
        const msg = createMessage({
            key: {
                remoteJid: 'group-1@g.us',
                participant: '1111@lid',
                participantAlt: '1111@s.whatsapp.net',
            },
            user: {lid: '1111@lid'},
        });

        const ctx = await buildContext(conn, msg);

        assert.equal(ctx.isGroup, true);
        assert.equal(ctx.sender, '1111@s.whatsapp.net');
        assert.equal(ctx.lid, '1111@lid');
        assert.equal(ctx.isAdmin, true);
        assert.equal(ctx.isBotAdmin, true);
        assert.equal(ctx.modoAdminActivo, true);
        assert.equal(msg.isAdmin, true);
        assert.equal(msg.isGroup, true);
        assert.deepEqual(calls.groupMetadata, []);
    });
}

async function testFetchesMetadataWhenCacheMisses(): Promise<void> {
    await withMocks({
        subbotConfig: createSubbotConfig(),
    }, async (calls) => {
        const conn = createConn(calls, {
            participants: [{id: '1111@s.whatsapp.net', admin: 'admin'}],
        });
        const msg = createMessage();

        const ctx = await buildContext(conn, msg);

        assert.equal(ctx.metadata.subject, 'Fetched');
        assert.equal(ctx.isAdmin, true);
        assert.deepEqual(calls.groupMetadata, ['group-1@g.us']);
    });
}

async function testGroupRestrictions(): Promise<void> {
    await withMocks({
        subbotConfig: createSubbotConfig(),
        groupSettings: {banned: true},
    }, async (calls) => {
        const conn = createConn(calls);
        const ctx = await buildContext(conn, createMessage());
        assert.equal(ctx.shouldAbort, true);
    });

    await withMocks({
        subbotConfig: createSubbotConfig(),
        groupSettings: {primary_bot: '7777@s.whatsapp.net'},
    }, async (calls) => {
        const conn = createConn(calls, {
            botId: '5555:1@s.whatsapp.net',
            participants: [{id: '7777@s.whatsapp.net'}],
        });
        const ctx = await buildContext(conn, createMessage());
        assert.equal(ctx.shouldAbort, true);
    });

    await withMocks({
        subbotConfig: createSubbotConfig(),
        groupSettings: {primary_bot: '7777@s.whatsapp.net'},
    }, async (calls) => {
        const conn = createConn(calls, {
            botId: '5555:1@s.whatsapp.net',
            participants: [{id: '7777@s.whatsapp.net'}],
        });
        const ctx = await buildContext(conn, createMessage({user: {id: '1111@s.whatsapp.net'}}));
        assert.equal(ctx.shouldAbort, true);
    });

    await withMocks({
        subbotConfig: createSubbotConfig(),
        groupSettings: {primary_bot: '7777@s.whatsapp.net'},
    }, async (calls) => {
        const conn = createConn(calls, {
            botId: '5555:1@s.whatsapp.net',
            participants: [
                {id: '1111@s.whatsapp.net', admin: 'admin'},
                {id: '7777@s.whatsapp.net'},
            ],
        });
        const ctx = await buildContext(conn, createMessage({user: {id: '1111@s.whatsapp.net'}}));
        assert.equal(ctx.isAdmin, true);
        assert.equal(ctx.shouldAbort, false);
    });
}

setupGlobals();
await testPrivateChatSenderAndOwnerResolution();
await testCreatorFromGlobalOwnerAndFromMeSender();
await testGroupMetadataAdminsAndCachedMetadata();
await testFetchesMetadataWhenCacheMisses();
await testGroupRestrictions();

console.log('context-builder.test.ts OK');
