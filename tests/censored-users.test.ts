import assert from 'node:assert/strict';
import type {GroupMetadata, GroupParticipant} from '@whiskeysockets/baileys';
import {repositories} from '../src/services/data-source.js';
import {censorGroupUser, findGroupCensoredUser, listGroupCensoredUsers, uncensorGroupUser} from '../src/services/censored-user.service.js';
import {invalidateGroupCensoredUsers} from '../src/lib/db-cache.js';
import {defaultCommandAccess} from '../src/utils/command-access.js';
import {isProtectedCensoredTarget, resolveCensoredTarget} from '../src/utils/censored-user.js';
import {interceptors} from '../src/plugins/hooks/_censored.js';
import type {BeforePluginContext} from '../src/types/context.js';
import type {BotMessage} from '../src/types/message.js';
import {commandAccessGuard} from '../src/guards/command-access.guard.js';
import type {GuardContext} from '../src/types/guard.js';

const originalRepository = repositories.censoredUsers;
const groupId = '573000000000-1@g.us';
const memberJid = '573001111111@s.whatsapp.net';
const adminJid = '573002222222@s.whatsapp.net';
const creatorJid = '573000000000@s.whatsapp.net';
const ownerJid = '573009999999@s.whatsapp.net';
const memberLid = '111111111111111@lid';

function participants(admin = false): GroupParticipant[] {
    return [
        {id: memberLid, participantAlt: memberJid, admin: admin ? 'admin' : null} as GroupParticipant,
        {id: adminJid, admin: 'admin'} as GroupParticipant,
        {id: creatorJid, admin: 'superadmin'} as GroupParticipant,
    ];
}

function metadata(admin = false): GroupMetadata {
    return {id: groupId, owner: creatorJid, participants: participants(admin)} as GroupMetadata;
}

async function testServiceAndCache(): Promise<void> {
    const calls: string[] = [];
    let records = [{
        group_id: groupId,
        user_id: memberJid,
        user_lid: memberLid,
        censored_by: adminJid,
        created_at: new Date('2026-07-29T12:00:00Z'),
    }];
    repositories.censoredUsers = {
        listByGroup: async () => {
            calls.push('list');
            return records;
        },
        upsert: async () => {
            calls.push('upsert');
            return {created: false};
        },
        delete: async () => {
            calls.push('delete');
            records = [];
            return true;
        },
    };
    invalidateGroupCensoredUsers(groupId);
    assert.equal((await listGroupCensoredUsers(groupId)).length, 1);
    assert.equal((await listGroupCensoredUsers(groupId)).length, 1);
    assert.equal(calls.filter(call => call === 'list').length, 1);
    assert.equal((await findGroupCensoredUser(groupId, [memberLid]))?.user_id, memberJid);
    assert.deepEqual(await censorGroupUser({groupId, userId: memberJid, userLid: memberLid, censoredBy: adminJid}), {created: false});
    assert.deepEqual(await uncensorGroupUser(groupId, memberJid, memberLid), {removed: true});
}

function testHierarchy(): void {
    const groupMetadata = metadata();
    const memberTarget = resolveCensoredTarget(memberJid, groupMetadata.participants);
    const adminTarget = resolveCensoredTarget(adminJid, groupMetadata.participants);
    const base = {chatId: groupId, metadata: groupMetadata, botConfig: {owners: [ownerJid]} as never, botJid: '573008888888@s.whatsapp.net'};

    assert.equal(isProtectedCensoredTarget({
        ...base,
        actor: {userId: '573007777777@s.whatsapp.net', isOwner: false, isGroupCreator: false, isAdmin: false},
        target: memberTarget,
    }), null);
    assert.equal(isProtectedCensoredTarget({
        ...base,
        actor: {userId: memberJid, userLid: memberLid, isOwner: false, isGroupCreator: false, isAdmin: false},
        target: memberTarget,
    }), 'self');
    assert.equal(isProtectedCensoredTarget({
        ...base,
        actor: {userId: memberJid, isOwner: false, isGroupCreator: false, isAdmin: false},
        target: adminTarget,
    }), 'rank');
    assert.equal(isProtectedCensoredTarget({
        ...base,
        actor: {userId: creatorJid, isOwner: false, isGroupCreator: true, isAdmin: true},
        target: adminTarget,
    }), null);
    assert.equal(isProtectedCensoredTarget({
        ...base,
        actor: {userId: creatorJid, isOwner: false, isGroupCreator: true, isAdmin: true},
        target: resolveCensoredTarget(ownerJid, groupMetadata.participants),
    }), 'owner');
}

async function testInterceptor(): Promise<void> {
    const deleted: unknown[] = [];
    repositories.censoredUsers = {
        listByGroup: async () => [{
            group_id: groupId,
            user_id: memberJid,
            user_lid: memberLid,
            censored_by: adminJid,
            created_at: new Date(),
        }],
        upsert: async () => ({created: true}),
        delete: async () => true,
    };
    const context = {
        conn: {sendMessage: async (_chatId: string, content: unknown) => { deleted.push(content); return {}; }},
        isOwner: false,
        isAdmin: false,
        isGroupCreator: false,
        isBotAdmin: true,
        isGroup: true,
        chatId: groupId,
        sender: memberJid,
        participants: participants(),
        metadata: metadata(),
        botConfig: {owners: []},
        branding: {watermark: 'Bot', logoUrl: ''},
        groupSettings: {commandAccess: {}},
    } as unknown as BeforePluginContext;
    const message = {
        sender: memberJid,
        lid: memberLid,
        fromMe: false,
        key: {id: 'message-1', remoteJid: groupId, participant: memberLid},
    } as unknown as BotMessage;

    invalidateGroupCensoredUsers(groupId);
    assert.deepEqual(await interceptors[0].run(message, context), {kind: 'handled'});
    assert.equal(deleted.length, 1);

    const disabled = {...context, groupSettings: {commandAccess: {censored: {enabled: false, accessMode: 'admin'}}}} as BeforePluginContext;
    assert.deepEqual(await interceptors[0].run(message, disabled), {kind: 'continue'});

    const promoted = {...context, participants: participants(true), metadata: metadata(true)} as BeforePluginContext;
    assert.deepEqual(await interceptors[0].run(message, promoted), {kind: 'continue'});
}

async function testCommandAccessGuard(): Promise<void> {
    const plugin = {commandAccess: {key: 'censored', defaultRule: defaultCommandAccess('censored')}};
    const guardContext = (role: {isAdmin?: boolean; isGroupCreator?: boolean; isOwner?: boolean}, rule?: {enabled: boolean; accessMode: 'all' | 'admin' | 'superadmin' | 'owner'}) => ({
        ctx: {
            isGroup: true,
            isAdmin: false,
            isGroupCreator: false,
            isOwner: false,
            groupSettings: {commandAccess: rule ? {censored: rule} : {}},
            ...role,
        },
        plugin,
    }) as unknown as GuardContext;

    assert.match(String(await commandAccessGuard(guardContext({}))), /solo admins/);
    assert.equal(await commandAccessGuard(guardContext({isAdmin: true})), null);
    assert.equal(await commandAccessGuard(guardContext({}, {enabled: true, accessMode: 'all'})), null);
    assert.match(String(await commandAccessGuard(guardContext({isAdmin: true}, {enabled: true, accessMode: 'superadmin'}))), /creador/);
    assert.equal(await commandAccessGuard(guardContext({isGroupCreator: true}, {enabled: true, accessMode: 'superadmin'})), null);
    assert.match(String(await commandAccessGuard(guardContext({isGroupCreator: true}, {enabled: true, accessMode: 'owner'}))), /owners/);
    assert.equal(await commandAccessGuard(guardContext({isOwner: true}, {enabled: true, accessMode: 'owner'})), null);
    assert.match(String(await commandAccessGuard(guardContext({isOwner: true}, {enabled: false, accessMode: 'owner'}))), /desactivado/);
}

try {
    assert.deepEqual(defaultCommandAccess('censored'), {enabled: true, accessMode: 'admin'});
    assert.deepEqual(defaultCommandAccess('other'), {enabled: true, accessMode: 'all'});
    await testServiceAndCache();
    testHierarchy();
    await testInterceptor();
    await testCommandAccessGuard();
} finally {
    repositories.censoredUsers = originalRepository;
    invalidateGroupCensoredUsers(groupId);
}

console.log('censored-users.test.ts OK');
