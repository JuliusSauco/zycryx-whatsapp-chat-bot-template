import assert from 'node:assert/strict';
import {repositories} from '../src/services/data-source.js';
import {findLevel} from '../src/lib/levelling.js';
import type {UserWallet} from '../src/domain/users.js';
import type {BeforePluginContext} from '../src/types/context.js';
import type {BotMessage} from '../src/types/message.js';
import {renderToggleMenu} from '../src/plugins/config/config-toggle-menu.js';

globalThis.info = {md: 'https://example.com'} as never;
const {
    applyAutoLevelUp,
    before,
    getRole,
    interceptors,
} = await import('../src/plugins/hooks/_autolevelup.js');

const originalUsers = repositories.users;
const multiplier = 650;

function wallet(overrides: Partial<UserWallet> = {}): UserWallet {
    return {
        id: 'user@s.whatsapp.net',
        nombre: 'User',
        limite: 0,
        exp: 0,
        coins: 0,
        botcoin: 0,
        zyxcoin: 0,
        level: 0,
        role: 'NOVATO(A) V',
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
        ...overrides,
    };
}

function message(sender = 'user@s.whatsapp.net'): BotMessage {
    return {
        sender,
        chat: 'group@g.us',
        pp: 'https://example.com/avatar.jpg',
    } as BotMessage;
}

function context(input: {
    enabled?: boolean;
    reply?: (...args: unknown[]) => Promise<unknown>;
} = {}): BeforePluginContext {
    return {
        conn: {
            reply: input.reply ?? (async () => ({})),
        },
        isGroup: true,
        groupSettings: {autolevelup: input.enabled ?? true},
        branding: {watermark: 'Bot', logoUrl: ''},
    } as BeforePluginContext;
}

try {
    const configMenu = renderToggleMenu({
        prefix: '.',
        command: 'config',
        isGroup: true,
        enabledIcon: '✅',
        disabledIcon: '❌',
        notGroupIcon: '➖',
        group: {autolevelup: true},
        familyAccess: {},
        commandAccess: {},
        subbot: null,
        isSubbot: false,
        isAdmin: true,
        isOwner: false,
        isGroupCreator: false,
    }, 'familias');
    assert.match(configMenu, /Autonivel RPG/);
    assert.match(configMenu, /\.enable autolevelup/);
    assert.match(configMenu, /\.disable autolevelup/);

    const postInterceptor = interceptors.find(item => item.phase === 'post');
    assert.ok(postInterceptor);
    assert.equal(postInterceptor.appliesTo, 'commands');
    assert.equal(postInterceptor.failurePolicy, 'report-only');

    {
        let walletReads = 0;
        repositories.users = {
            ...originalUsers,
            findWallet: async () => {
                walletReads++;
                return wallet();
            },
        };
        await applyAutoLevelUp(message(), context({enabled: false}), false);
        assert.equal(walletReads, 0);
    }

    {
        let walletReads = 0;
        repositories.users = {
            ...originalUsers,
            findWallet: async () => {
                walletReads++;
                return wallet();
            },
        };
        await applyAutoLevelUp(message('post-check@s.whatsapp.net'), context(), false);
        await applyAutoLevelUp(message('post-check@s.whatsapp.net'), context(), false);
        assert.equal(walletReads, 2);
    }

    {
        let walletReads = 0;
        repositories.users = {
            ...originalUsers,
            findWallet: async () => {
                walletReads++;
                return wallet();
            },
        };
        const throttledMessage = message('throttled@s.whatsapp.net');
        await before(throttledMessage, context());
        await before(throttledMessage, context());
        assert.equal(walletReads, 1);
    }

    {
        const exp = 100_000;
        const expectedLevel = findLevel(exp, multiplier);
        const writes: unknown[] = [];
        const replies: unknown[][] = [];
        repositories.users = {
            ...originalUsers,
            findWallet: async () => wallet({exp}),
            setLevelRole: async (...args) => { writes.push(args); },
        };
        await applyAutoLevelUp(message('winner@s.whatsapp.net'), context({
            reply: async (...args) => {
                replies.push(args);
                return {};
            },
        }), false);

        assert.deepEqual(writes, [['winner@s.whatsapp.net', expectedLevel, getRole(expectedLevel).name]]);
        assert.equal(replies.length, 1);
        assert.match(String(replies[0][1]), /0/);
        assert.match(String(replies[0][1]), new RegExp(String(expectedLevel)));
    }

    {
        let persisted = false;
        repositories.users = {
            ...originalUsers,
            findWallet: async () => wallet({exp: 100_000}),
            setLevelRole: async () => { persisted = true; },
        };
        await assert.rejects(applyAutoLevelUp(message('send-error@s.whatsapp.net'), context({
            reply: async () => { throw new Error('send failed'); },
        }), false), /send failed/);
        assert.equal(persisted, true);
    }
} finally {
    repositories.users = originalUsers;
}

console.log('autolevelup.test.ts OK');
