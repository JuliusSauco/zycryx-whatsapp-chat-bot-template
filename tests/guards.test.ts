import assert from 'node:assert/strict';
import {adminModeGuard} from '../src/guards/admin-mode.guard.js';
import {adminGuard} from '../src/guards/admin.guard.js';
import {banGuard} from '../src/guards/ban.guard.js';
import {modeGuard} from '../src/guards/mode.guard.js';
import {nsfwGuard} from '../src/guards/nsfw.guard.js';
import {ownerGuard} from '../src/guards/owner.guard.js';
import {resourceGuard} from '../src/guards/resource.guard.js';
import {scopeGuard} from '../src/guards/scope.guard.js';
import {runGuards} from '../src/guards/index.js';
import {repositories} from '../src/services/data-source.js';
import {SILENT_REJECT, type GuardContext} from '../src/types/guard.js';
import type {BotMessage} from '../src/types/message.js';
import type {Plugin} from '../src/types/plugin.js';

type Calls = {
    replies: string[];
    sendMessages: unknown[];
    sendFiles: unknown[];
    decrementedLimits: Array<{userId: string; amount: number}>;
    decrementedMoney: Array<{userId: string; amount: number}>;
    banNotices: Array<{userId: string; notices: number}>;
};

const originalUsers = repositories.users;
const originalGroupSettings = repositories.groupSettings;

function setupGlobals(): void {
    globalThis.info = {
        ...(globalThis.info || {}),
        fb: 'https://facebook.example/owner',
        md: 'https://github.example/repo',
    };
}

function createCalls(): Calls {
    return {
        replies: [],
        sendMessages: [],
        sendFiles: [],
        decrementedLimits: [],
        decrementedMoney: [],
        banNotices: [],
    };
}

function createMessage(calls: Calls, overrides: Partial<BotMessage> = {}): BotMessage {
    return {
        chat: 'chat-1@g.us',
        sender: 'user-1@s.whatsapp.net',
        key: {
            remoteJid: 'chat-1@g.us',
            participant: 'user-1@s.whatsapp.net',
        },
        pp: Buffer.from('pp'),
        reply: async (text: string) => {
            calls.replies.push(text);
            return {} as never;
        },
        ...overrides,
    } as unknown as BotMessage;
}

function createContext(calls: Calls, overrides: Partial<GuardContext['ctx']> = {}, plugin: Partial<Plugin> = {}): GuardContext {
    const m = createMessage(calls);
    return {
        m,
        conn: {
            sendMessage: async (_jid: string, content: unknown) => {
                calls.sendMessages.push(content);
                return {} as never;
            },
            sendFile: async (_jid: string, path: unknown) => {
                calls.sendFiles.push(path);
                return {} as never;
            },
        } as GuardContext['conn'],
        ctx: {
            chatId: 'chat-1@g.us',
            sender: 'user-1@s.whatsapp.net',
            senderJid: 'user-1@s.whatsapp.net',
            lid: '',
            isGroup: true,
            isCreator: false,
            isOwner: false,
            isROwner: false,
            isAdmin: false,
            isBotAdmin: false,
            metadata: {participants: []},
            participants: [],
            adminIds: [],
            botConfig: {mode: 'public'},
            botJid: 'bot@s.whatsapp.net',
            modoAdminActivo: false,
            groupSettings: {
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
            },
            shouldAbort: false,
            ...overrides,
        } as GuardContext['ctx'],
        plugin: {
            async execute() {
                return undefined;
            },
            ...plugin,
        } as Plugin,
    };
}

function installRepositoryMocks(calls: Calls, options: {
    resources?: {limite: number; money: number; level: number};
    banInfo?: {banned: boolean; razon_ban: string | null; avisos_ban: number} | null;
    nsfwSettings?: {modohorny: boolean; nsfw_horario: string | null} | null;
} = {}): void {
    repositories.users = {
        ...originalUsers,
        getResources: async () => options.resources ?? {limite: 10, money: 10, level: 10},
        decrementLimit: async (userId: string, amount: number) => {
            calls.decrementedLimits.push({userId, amount});
        },
        decrementMoney: async (userId: string, amount: number) => {
            calls.decrementedMoney.push({userId, amount});
        },
        findBanInfo: async () => options.banInfo ?? null,
        incrementBanNotice: async (userId: string, notices: number) => {
            calls.banNotices.push({userId, notices});
        },
    };

    repositories.groupSettings = {
        ...originalGroupSettings,
        findNsfwSettings: async () => options.nsfwSettings ?? {modohorny: false, nsfw_horario: null},
    };
}

function restoreRepositories(): void {
    repositories.users = originalUsers;
    repositories.groupSettings = originalGroupSettings;
}

async function testOwnerAdminScopeModeGuards(): Promise<void> {
    const calls = createCalls();

    assert.match(String(await ownerGuard(createContext(calls, {}, {owner: true}))), /propietario/);
    assert.equal(await ownerGuard(createContext(calls, {isOwner: true}, {owner: true})), null);
    assert.match(String(await ownerGuard(createContext(calls, {}, {rowner: true}))), /propietario/);
    assert.equal(await ownerGuard(createContext(calls, {isROwner: true}, {rowner: true})), null);

    assert.match(String(await adminGuard(createContext(calls, {}, {admin: true}))), /admins/);
    assert.equal(await adminGuard(createContext(calls, {isAdmin: true}, {admin: true})), null);
    assert.match(String(await adminGuard(createContext(calls, {}, {botAdmin: true}))), /haz admin/);
    assert.equal(await adminGuard(createContext(calls, {isBotAdmin: true}, {botAdmin: true})), null);

    assert.match(String(await scopeGuard(createContext(calls, {isGroup: false}, {group: true}))), /grupo/);
    assert.match(String(await scopeGuard(createContext(calls, {isGroup: true}, {private: true}))), /pv/);
    assert.equal(await scopeGuard(createContext(calls, {isGroup: false}, {private: true})), null);

    assert.equal(await modeGuard(createContext(calls, {botConfig: {mode: 'private'}})), SILENT_REJECT);
    assert.equal(await modeGuard(createContext(calls, {botConfig: {mode: 'private'}, isCreator: true})), null);
    assert.equal(await modeGuard(createContext(calls, {botConfig: {mode: 'private'}, senderJid: 'bot@s.whatsapp.net'})), null);

    assert.equal(await adminModeGuard(createContext(calls, {modoAdminActivo: true})), SILENT_REJECT);
    assert.equal(await adminModeGuard(createContext(calls, {modoAdminActivo: true, isAdmin: true})), null);
    assert.equal(await adminModeGuard(createContext(calls, {modoAdminActivo: true, isOwner: true})), null);
}

async function testResourceGuard(): Promise<void> {
    const calls = createCalls();
    installRepositoryMocks(calls, {resources: {limite: 5, money: 10, level: 3}});
    try {
        assert.equal(await resourceGuard(createContext(calls, {}, {limit: 2, money: 4, level: 3})), null);
        assert.deepEqual(calls.decrementedLimits, [{userId: 'user-1@s.whatsapp.net', amount: 2}]);
        assert.deepEqual(calls.decrementedMoney, [{userId: 'user-1@s.whatsapp.net', amount: 4}]);
        assert.equal(calls.replies.length, 2);

        assert.match(String(await resourceGuard(createContext(calls, {}, {limit: 6}))), /#buy/);
        assert.match(String(await resourceGuard(createContext(calls, {}, {money: 11}))), /LOLICOINS/);
        assert.match(String(await resourceGuard(createContext(calls, {}, {level: 4}))), /𝐍𝐞𝐜𝐞𝐬𝐢𝐭𝐚/);
    } finally {
        restoreRepositories();
    }
}

async function testBanGuard(): Promise<void> {
    const calls = createCalls();
    installRepositoryMocks(calls, {
        banInfo: {banned: true, razon_ban: 'Spam', avisos_ban: 1},
    });
    try {
        assert.equal(await banGuard(createContext(calls)), SILENT_REJECT);
        assert.deepEqual(calls.banNotices, [{userId: 'user-1@s.whatsapp.net', notices: 2}]);
        assert.equal(calls.sendMessages.length, 1);
    } finally {
        restoreRepositories();
    }

    const maxNoticeCalls = createCalls();
    installRepositoryMocks(maxNoticeCalls, {
        banInfo: {banned: true, razon_ban: null, avisos_ban: 3},
    });
    try {
        assert.equal(await banGuard(createContext(maxNoticeCalls)), SILENT_REJECT);
        assert.equal(maxNoticeCalls.banNotices.length, 0);
        assert.equal(maxNoticeCalls.sendMessages.length, 0);
    } finally {
        restoreRepositories();
    }
}

async function testNsfwGuard(): Promise<void> {
    const calls = createCalls();
    installRepositoryMocks(calls, {
        nsfwSettings: {modohorny: false, nsfw_horario: null},
    });
    try {
        assert.equal(await nsfwGuard(createContext(calls, {isGroup: true}, {tags: ['nsfw']})), SILENT_REJECT);
        assert.equal(calls.sendFiles.length, 1);
    } finally {
        restoreRepositories();
    }

    const enabledCalls = createCalls();
    installRepositoryMocks(enabledCalls, {
        nsfwSettings: {modohorny: true, nsfw_horario: '00:00-23:59'},
    });
    try {
        assert.equal(await nsfwGuard(createContext(enabledCalls, {isGroup: true}, {tags: ['nsfw']})), null);
        assert.equal(enabledCalls.sendFiles.length, 0);
    } finally {
        restoreRepositories();
    }
}

async function testRunGuardsPipeline(): Promise<void> {
    const calls = createCalls();
    installRepositoryMocks(calls);
    try {
        assert.deepEqual(
            await runGuards(createContext(calls, {botConfig: {mode: 'private'}}, {owner: true})),
            {error: null, silent: true},
        );

        assert.deepEqual(
            await runGuards(createContext(calls, {}, {owner: true})),
            {
                error: '⚠️ Tu que? no eres mi propietario para venir a dame orden 🙄, solo el dueño del sub-bot o el owner puede usar este comando.',
                silent: false,
            },
        );

        assert.deepEqual(await runGuards(createContext(calls, {isOwner: true}, {owner: true})), {
            error: null,
            silent: false,
        });
    } finally {
        restoreRepositories();
    }
}

setupGlobals();
await testOwnerAdminScopeModeGuards();
await testResourceGuard();
await testBanGuard();
await testNsfwGuard();
await testRunGuardsPipeline();

console.log('guards.test.ts OK');
