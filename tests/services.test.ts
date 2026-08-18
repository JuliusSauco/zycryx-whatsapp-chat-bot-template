import assert from 'node:assert/strict';
import {configureServiceRepositories} from '../src/services/data-source.js';
import {createDrizzleRepositories} from '../src/adapters/drizzle/repositories.js';

configureServiceRepositories(createDrizzleRepositories());
import {invalidateApiTokenCache, getDecodedApiToken} from '../src/services/api-token.service.js';
import {
    countChats,
    countChatsByBot,
    deleteMessageCount,
    incrementMessageCount,
    listGroupMessageActivity,
    listGroupMessageCounts,
    listJoinedGroupIdsByBot,
    logGroupMessage,
    markBotLeftGroup,
    markGroupMessageDeleted,
    upsertActiveChat,
} from '../src/services/chat.service.js';
import {invalidateGroupSettings, invalidateSubbotConfig} from '../src/lib/db-cache.js';
import {
    getContextGroupSettings,
    getGroupFamilyAccessRule,
    getGroupSettings,
    getNsfwSettings,
    setGroupAutoAcceptMode,
    setGroupBooleanFlag,
    setGroupFamilyAccessRule,
    setGroupTextMessage,
    setMemoryTtl,
    setPrimaryBot,
} from '../src/services/group-settings.service.js';
import {createDefaultFamilyAccessMap} from '../src/utils/family-access.js';
import {
    cleanExpiredChatMemories,
    claimPendingReports,
    createReport,
    listExpiredGroups,
    markReportDelivered,
    markReportFailed,
} from '../src/services/runtime-tasks.service.js';
import {
    getSubbotConfig,
    setSubbotBooleanFlag,
    setSubbotLogoUrl,
    setSubbotMode,
    setSubbotName,
    setSubbotOwners,
    setSubbotPrefix,
} from '../src/services/subbot.service.js';
import {
    addWalletResource,
    addWalletResourceAndSetWait,
    addWalletResourcesAndSetFields,
    exchangeWalletResources,
    getWallet,
    isWalletResource,
    robExperience,
    setUserLevelRole,
    transferWalletResource,
} from '../src/services/wallet.service.js';
import {repositories} from '../src/services/data-source.js';
import type {SubbotConfig} from '../src/types/config.js';
import type {UserWallet} from '../src/ports/repositories.js';

const originals = {
    apiTokens: repositories.apiTokens,
    chatMemory: repositories.chatMemory,
    chats: repositories.chats,
    groupSettings: repositories.groupSettings,
    messageLogs: repositories.messageLogs,
    messages: repositories.messages,
    reports: repositories.reports,
    subbots: repositories.subbots,
    users: repositories.users,
};

function restoreRepositories(): void {
    repositories.apiTokens = originals.apiTokens;
    repositories.chatMemory = originals.chatMemory;
    repositories.chats = originals.chats;
    repositories.groupSettings = originals.groupSettings;
    repositories.messageLogs = originals.messageLogs;
    repositories.messages = originals.messages;
    repositories.reports = originals.reports;
    repositories.subbots = originals.subbots;
    repositories.users = originals.users;
    invalidateApiTokenCache();
    invalidateGroupSettings('group-1@g.us');
    invalidateGroupSettings('group-2@g.us');
    invalidateSubbotConfig('bot@s.whatsapp.net');
    invalidateSubbotConfig('missing@s.whatsapp.net');
}

function subbotConfig(overrides: Partial<SubbotConfig> = {}): SubbotConfig {
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

async function testChatService(): Promise<void> {
    const calls: unknown[] = [];
    repositories.chats = {
        ...originals.chats,
        upsertActiveChat: async input => {
            calls.push(['upsertActiveChat', input]);
        },
        insertIfMissing: async chatId => {
            calls.push(['insertIfMissing', chatId]);
        },
        markBotLeftGroup: async (groupId, botId) => {
            calls.push(['markBotLeftGroup', groupId, botId]);
        },
        listJoinedGroupIdsByBot: async botId => {
            calls.push(['listJoinedGroupIdsByBot', botId]);
            return ['g1@g.us', 'g2@g.us'];
        },
        countChats: async () => 7,
        countByBot: async botId => {
            calls.push(['countByBot', botId]);
            return {totalGroups: 3, joinedGroups: 2, privateChats: 4};
        },
    };
    repositories.messages = {
        ...originals.messages,
        incrementUserGroupCount: async (userId, groupId) => {
            calls.push(['incrementUserGroupCount', userId, groupId]);
        },
        deleteUserGroupCount: async (userId, groupId) => {
            calls.push(['deleteUserGroupCount', userId, groupId]);
        },
        listGroupCounts: async groupId => {
            calls.push(['listGroupCounts', groupId]);
            return [{user_id: 'u1', message_count: 2}];
        },
        listGroupActivity: async groupId => {
            calls.push(['listGroupActivity', groupId]);
            return [{user_id: 'u1', message_count: 2, last_message_at: new Date('2026-06-01T00:00:00Z')}];
        },
    };
    repositories.messageLogs = {
        ...originals.messageLogs,
        create: async input => {
            calls.push(['messageLogCreate', input]);
        },
        markDeleted: async input => {
            calls.push(['messageLogDeleted', input]);
        },
    };

    try {
        await upsertActiveChat({chatId: 'chat-1', isGroup: true, timestamp: 123, botId: 'bot'});
        await markBotLeftGroup('group-1', 'bot');
        assert.deepEqual(await listJoinedGroupIdsByBot('bot'), ['g1@g.us', 'g2@g.us']);
        assert.equal(await countChats(), 7);
        assert.deepEqual(await countChatsByBot('bot'), {totalGroups: 3, joinedGroups: 2, privateChats: 4});
        await incrementMessageCount('u1', 'g1');
        await deleteMessageCount('u1', 'g1');
        assert.deepEqual(await listGroupMessageCounts('g1'), [{user_id: 'u1', message_count: 2}]);
        assert.deepEqual(await listGroupMessageActivity('g1'), [{user_id: 'u1', message_count: 2, last_message_at: new Date('2026-06-01T00:00:00Z')}]);
        await logGroupMessage({
            groupId: 'g1',
            userId: 'u1',
            messageId: 'm1',
            messageText: 'hola',
            messageType: 'text',
            isReply: false,
            replyToMessageId: null,
        });
        const deletedAt = new Date('2026-01-01T00:00:00Z');
        await markGroupMessageDeleted({groupId: 'g1', messageId: 'm1', deletedBy: 'u2', deletedByLid: null, deletedAt});

        assert.deepEqual(calls.slice(0, 2), [
            ['upsertActiveChat', {chatId: 'chat-1', isGroup: true, timestamp: 123, botId: 'bot'}],
            ['markBotLeftGroup', 'group-1', 'bot'],
        ]);
        assert.equal(calls.some(call => Array.isArray(call) && call[0] === 'messageLogCreate'), true);
        assert.equal(calls.some(call => Array.isArray(call) && call[0] === 'messageLogDeleted'), true);
    } finally {
        restoreRepositories();
    }
}

async function testGroupSettingsService(): Promise<void> {
    const calls: unknown[] = [];
    let contextReads = 0;
    let fullReads = 0;
    repositories.groupSettings = {
        ...originals.groupSettings,
        findContextSettings: async groupId => {
            contextReads++;
            calls.push(['findContextSettings', groupId]);
            return {
                banned: false,
                primary_bot: null,
                modoadmin: true,
                antifake: false,
                message_logging: true,
                antilink: false,
                antilink2: false,
                virusTotal: false,
                audios: true,
                autolevelup: true,
                familyAccess: createDefaultFamilyAccessMap(),
            };
        },
        findNsfwSettings: async groupId => {
            calls.push(['findNsfwSettings', groupId]);
            return null;
        },
        listFamilyAccessRules: async () => [],
        upsertFamilyAccessRule: async (groupId, feature, rule) => calls.push(['upsertFamilyAccessRule', groupId, feature, rule]),
        findByGroupId: async groupId => {
            fullReads++;
            calls.push(['findByGroupId', groupId]);
            return {welcome: true, banned: false};
        },
        setBooleanFlag: async (chatId, flag, value) => calls.push(['setBooleanFlag', chatId, flag, value]),
        setAutoAcceptMode: async (chatId, mode) => calls.push(['setAutoAcceptMode', chatId, mode]),
        setTextMessage: async input => calls.push(['setTextMessage', input]),
        setMemoryTtl: async (chatId, seconds) => calls.push(['setMemoryTtl', chatId, seconds]),
        setPrimaryBot: async (chatId, botId) => calls.push(['setPrimaryBot', chatId, botId]),
    };

    try {
        invalidateGroupSettings('group-1@g.us');
        assert.equal((await getContextGroupSettings('group-1@g.us')).modoadmin, true);
        assert.equal((await getContextGroupSettings('group-1@g.us')).audios, true);
        assert.equal(contextReads, 1);
        assert.deepEqual(await getGroupFamilyAccessRule('group-1@g.us', 'games'), {enabled: true, accessMode: 'all'});

        assert.deepEqual(await getNsfwSettings('group-1@g.us'), {modohorny: false, nsfwAccessMode: 'owner', nsfwGifEnabled: false, nsfwGifAccessMode: 'owner', nsfw_horario: null});

        assert.deepEqual(await getGroupSettings('group-1@g.us'), {welcome: true, banned: false});
        assert.deepEqual(await getGroupSettings('group-1@g.us'), {welcome: true, banned: false});
        assert.equal(fullReads, 1);

        await setGroupBooleanFlag('group-1@g.us', 'antilink', true);
        await setGroupFamilyAccessRule('group-1@g.us', 'games', {enabled: false, accessMode: 'admin'});
        await setGroupAutoAcceptMode('group-1@g.us', '' as never);
        await setGroupTextMessage('group-1@g.us', 'welcome', 'hola', true, {hidetag: true});
        await setMemoryTtl('group-1@g.us', 3600);
        await setPrimaryBot('group-1@g.us', 'bot@s.whatsapp.net');

        assert.equal(calls.some(call => Array.isArray(call) && call[0] === 'setBooleanFlag'), true);
        assert.equal(calls.some(call => Array.isArray(call) && call[0] === 'upsertFamilyAccessRule'), true);
        assert.deepEqual(calls.find(call => Array.isArray(call) && call[0] === 'setAutoAcceptMode'), ['setAutoAcceptMode', 'group-1@g.us', 'off']);
        assert.equal(calls.some(call => Array.isArray(call) && call[0] === 'setTextMessage'), true);
    } finally {
        restoreRepositories();
    }
}

async function testSubbotService(): Promise<void> {
    const calls: unknown[] = [];
    let reads = 0;
    repositories.subbots = {
        ...originals.subbots,
        findConfig: async botId => {
            reads++;
            calls.push(['findConfig', botId]);
            return botId === 'missing@s.whatsapp.net'
                ? null
                : subbotConfig({mode: 'private', owners: ['owner@s.whatsapp.net']});
        },
        setBooleanFlag: async (botId, flag, value) => calls.push(['setBooleanFlag', botId, flag, value]),
        setName: async (botId, name) => calls.push(['setName', botId, name]),
        setLogoUrl: async (botId, logoUrl) => calls.push(['setLogoUrl', botId, logoUrl]),
        setMode: async (botId, mode) => calls.push(['setMode', botId, mode]),
        setPrefix: async (botId, prefix) => calls.push(['setPrefix', botId, prefix]),
        setOwners: async (botId, owners) => calls.push(['setOwners', botId, owners]),
    };

    try {
        invalidateSubbotConfig('bot@s.whatsapp.net');
        const config = await getSubbotConfig('bot:12@s.whatsapp.net');
        assert.equal(config.mode, 'private');
        assert.deepEqual(await getSubbotConfig('bot:12@s.whatsapp.net'), config);
        assert.equal(reads, 1);

        invalidateSubbotConfig('missing@s.whatsapp.net');
        assert.deepEqual((await getSubbotConfig('missing@s.whatsapp.net')).prefix, ['/', '.', '#']);

        await setSubbotBooleanFlag('bot:12@s.whatsapp.net', 'anti_call', true);
        await setSubbotName('bot:12@s.whatsapp.net', 'Bot');
        await setSubbotLogoUrl('bot:12@s.whatsapp.net', 'logo');
        await setSubbotMode('bot:12@s.whatsapp.net', 'private');
        await setSubbotPrefix('bot:12@s.whatsapp.net', ['!']);
        await setSubbotOwners('bot:12@s.whatsapp.net', ['owner@s.whatsapp.net']);

        assert.deepEqual(calls.find(call => Array.isArray(call) && call[0] === 'setName'), ['setName', 'bot@s.whatsapp.net', 'Bot']);
        assert.equal(calls.filter(call => Array.isArray(call) && String(call[1]) === 'bot@s.whatsapp.net').length >= 6, true);
    } finally {
        restoreRepositories();
    }
}

async function testRuntimeTasksService(): Promise<void> {
    const calls: unknown[] = [];
    repositories.groupSettings = {
        ...originals.groupSettings,
        listExpiredGroups: async now => {
            calls.push(['listExpiredGroups', now]);
            return [{group_id: 'g1', expired: now - 1}];
        },
        clearExpiration: async groupId => calls.push(['clearExpiration', groupId]),
    };
    repositories.reports = {
        ...originals.reports,
        claimPending: async (limit, workerId, leaseSeconds) => {
            calls.push(['claimPending', limit, workerId, leaseSeconds]);
            return [{id: 1, sender_id: 'u1', mensaje: 'hola', tipo: 'reporte'}];
        },
        create: async input => calls.push(['reportCreate', input]),
        markDelivered: async (id, workerId, messageId) => calls.push(['reportDelivered', id, workerId, messageId]),
        markFailed: async (id, workerId, error) => calls.push(['reportFailed', id, workerId, error]),
    };
    repositories.chatMemory = {
        ...originals.chatMemory,
        listExpirable: async () => [
            {chat_id: 'old', updated_at: new Date('2026-01-01T00:00:00Z'), memory_ttl: 60},
            {chat_id: 'fresh', updated_at: new Date('2026-01-01T00:10:00Z'), memory_ttl: 3600},
        ],
        deleteByChatId: async chatId => calls.push(['deleteMemory', chatId]),
    };

    try {
        assert.deepEqual(await listExpiredGroups(100), [{group_id: 'g1', expired: 99}]);
        assert.deepEqual(await claimPendingReports(5, 'worker', 30), [{id: 1, sender_id: 'u1', mensaje: 'hola', tipo: 'reporte'}]);
        await createReport({senderId: 'u1', senderName: 'User', message: 'hola', type: 'reporte'});
        await markReportDelivered(1, 'worker', 'message-1');
        await markReportFailed(2, 'worker', 'network');
        assert.deepEqual(
            await cleanExpiredChatMemories(new Date('2026-01-01T00:20:00Z').getTime()),
            ['old'],
        );
        assert.equal(calls.some(call => Array.isArray(call) && call[0] === 'deleteMemory' && call[1] === 'old'), true);
    } finally {
        restoreRepositories();
    }
}

async function testWalletAndApiTokenServices(): Promise<void> {
    const calls: unknown[] = [];
    const wallet: UserWallet = {
        id: 'u1',
        nombre: null,
        limite: 1,
        exp: 2,
        coins: 3,
        botcoin: 0,
        zyxcoin: 0,
        level: 5,
        role: null,
        wait: 0,
        lastclaim: 0,
        dailystreak: 0,
        lastcofre: 0,
        lastmiming: 0,
        lastwork: 0,
        crime: 0,
        lastrob: 0,
        lastslut: 0,
        timevot: 0,
        ryTime: 0,
    };

    repositories.users = {
        ...originals.users,
        findWallet: async userId => {
            calls.push(['findWallet', userId]);
            return wallet;
        },
        addWalletResource: async (userId, resource, amount) => {
            calls.push(['addWalletResource', userId, resource, amount]);
            return 10;
        },
        addWalletResourceAndSetWait: async (userId, resource, amount, wait) => {
            calls.push(['addWalletResourceAndSetWait', userId, resource, amount, wait]);
            return 11;
        },
        addWalletResourcesAndSetFields: async input => calls.push(['addWalletResourcesAndSetFields', input]),
        exchangeWalletResources: async input => {
            calls.push(['exchangeWalletResources', input]);
            return true;
        },
        transferWalletResource: async input => {
            calls.push(['transferWalletResource', input]);
            return false;
        },
        robExperience: async input => {
            calls.push(['robExperience', input]);
            return {
                kind: 'success',
                amount: input.amount ?? 500,
                availableLevel: 1,
                maxAmount: 1000,
                remainingRobberies: 3,
                nextAvailableAt: input.attemptedAt + 3_600_000,
                dailyLimitReached: false,
            };
        },
        setLevelRole: async (userId, level, role) => calls.push(['setLevelRole', userId, level, role]),
    };
    repositories.apiTokens = {
        ...originals.apiTokens,
        findToken: async name => {
            calls.push(['findToken', name]);
            return 'secret-token';
        },
    };

    try {
        assert.equal(isWalletResource('coins'), true);
        assert.equal(isWalletResource('money'), false);
        assert.equal(isWalletResource('diamonds'), false);
        assert.equal(await getWallet('u1'), wallet);
        assert.equal(await addWalletResource('u1', 'coins', 3), 10);
        assert.equal(await addWalletResourceAndSetWait('u1', 'exp', 4, 123), 11);
        await addWalletResourcesAndSetFields({userId: 'u1', resources: {coins: 1}, fields: {lastclaim: 2}});
        assert.equal(await exchangeWalletResources({userId: 'u1', from: 'coins', to: 'exp', fromAmount: 1, toAmount: 2}), true);
        assert.equal(await transferWalletResource({from: 'u1', to: 'u2', resource: 'coins', amount: 1}), false);
        assert.deepEqual(await robExperience({robberId: 'u1', victimId: 'u2', attemptedAt: 123}), {
            kind: 'success',
            amount: 500,
            availableLevel: 1,
            maxAmount: 1000,
            remainingRobberies: 3,
            nextAvailableAt: 3_600_123,
            dailyLimitReached: false,
        });
        await setUserLevelRole('u1', 9, 'Pro');

        invalidateApiTokenCache('service');
        assert.equal(await getDecodedApiToken('service'), 'secret-token');
        assert.equal(await getDecodedApiToken('service'), 'secret-token');
        assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'findToken').length, 1);
    } finally {
        restoreRepositories();
    }
}

await testChatService();
await testGroupSettingsService();
await testSubbotService();
await testRuntimeTasksService();
await testWalletAndApiTokenServices();

console.log('services.test.ts OK');
