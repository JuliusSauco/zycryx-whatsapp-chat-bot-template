import type {CensoredUserRecord, UpsertCensoredUserInput} from '../domain/censored-users.js';
import {getCachedGroupCensoredUsers, invalidateGroupCensoredUsers, setCachedGroupCensoredUsers} from '../lib/db-cache.js';
import {repositories} from './data-source.js';
import {cleanJid} from '../utils/jid.js';

export async function listGroupCensoredUsers(groupId: string): Promise<CensoredUserRecord[]> {
    const cached = getCachedGroupCensoredUsers<CensoredUserRecord[]>(groupId);
    if (cached) return cached;
    const records = await repositories.censoredUsers.listByGroup(groupId);
    setCachedGroupCensoredUsers(groupId, records);
    return records;
}

export async function findGroupCensoredUser(groupId: string, identities: Array<string | null | undefined>): Promise<CensoredUserRecord | null> {
    const candidates = new Set(identities.filter((value): value is string => Boolean(value)).map(cleanJid));
    const records = await listGroupCensoredUsers(groupId);
    return records.find(record => candidates.has(cleanJid(record.user_id)) || !!record.user_lid && candidates.has(cleanJid(record.user_lid))) || null;
}

export async function censorGroupUser(input: UpsertCensoredUserInput): Promise<{created: boolean}> {
    const result = await repositories.censoredUsers.upsert(input);
    invalidateGroupCensoredUsers(input.groupId);
    return result;
}

export async function uncensorGroupUser(groupId: string, userId: string, userLid: string | null): Promise<{removed: boolean}> {
    const removed = await repositories.censoredUsers.delete(groupId, userId, userLid);
    invalidateGroupCensoredUsers(groupId);
    return {removed};
}
