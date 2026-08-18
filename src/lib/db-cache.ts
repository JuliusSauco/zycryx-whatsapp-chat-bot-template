/**
 * Cache en memoria para queries que se ejecutan en cada mensaje y cambian raramente.
 *
 * - `subbots` (config del bot): TTL 60s — invalidado desde plugins que cambian
 *   prefix/name/logo/owners/mode/anti_private/anti_call/privacy/prestar.
 * - `group_settings`: TTL 60s — invalidado desde plugins que cambian
 *   banned/primary_bot/modoadmin/antifake/welcome/antilink/etc.
 *
 * Con cache hit, una query a Postgres (potencialmente 100-200ms si la DB es
 * remota) se reemplaza por una lectura de Map (sub-milisegundo).
 */

import {ENV} from '../core/env.js';
import {clearRedisNamespace, deleteRedisKeys} from './redis-runtime.js';

const TTL_MS = Number.isFinite(ENV.DB_CACHE_TTL_MS) && ENV.DB_CACHE_TTL_MS > 0
    ? ENV.DB_CACHE_TTL_MS
    : 300_000;

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const subbotConfigCache = new Map<string, CacheEntry<unknown>>();
const groupContextSettingsCache = new Map<string, CacheEntry<unknown>>();
const groupFullSettingsCache = new Map<string, CacheEntry<unknown>>();
const groupCensoredUsersCache = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 5_000;
const stats = {hits: 0, misses: 0, writes: 0, evictions: 0};

export const DISTRIBUTED_DB_CACHE = {
    subbot: 'cache:db:subbot',
    groupContext: 'cache:db:group-context',
} as const;

function setBounded<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    cache.delete(key);
    while (cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = cache.keys().next().value as string | undefined;
        if (!oldest) break;
        cache.delete(oldest);
        stats.evictions++;
    }
    cache.set(key, {data, expiresAt: Date.now() + TTL_MS});
    stats.writes++;
}

function readEntry<T>(cache: Map<string, CacheEntry<unknown>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) {
        stats.misses++;
        return null;
    }
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        stats.misses++;
        return null;
    }
    stats.hits++;
    return entry.data as T;
}

export function getCachedSubbotConfig<T>(botId: string): T | null {
    return readEntry<T>(subbotConfigCache, botId);
}

export function setCachedSubbotConfig<T>(botId: string, data: T): void {
    setBounded(subbotConfigCache, botId, data);
}

export function invalidateSubbotConfig(botId: string): void {
    subbotConfigCache.delete(botId);
    void deleteRedisKeys([{namespace: DISTRIBUTED_DB_CACHE.subbot, key: botId}]);
}

export function getCachedGroupSettings<T>(chatId: string): T | null {
    return readEntry<T>(groupContextSettingsCache, chatId);
}

export function setCachedGroupSettings<T>(chatId: string, data: T): void {
    setBounded(groupContextSettingsCache, chatId, data);
}

export function getCachedFullGroupSettings<T>(chatId: string): T | null {
    return readEntry<T>(groupFullSettingsCache, chatId);
}

export function setCachedFullGroupSettings<T>(chatId: string, data: T): void {
    setBounded(groupFullSettingsCache, chatId, data);
}

export function invalidateGroupSettings(chatId: string): void {
    groupContextSettingsCache.delete(chatId);
    groupFullSettingsCache.delete(chatId);
    void deleteRedisKeys([{namespace: DISTRIBUTED_DB_CACHE.groupContext, key: chatId}]);
}

export function getCachedGroupCensoredUsers<T>(chatId: string): T | null {
    return readEntry<T>(groupCensoredUsersCache, chatId);
}

export function setCachedGroupCensoredUsers<T>(chatId: string, data: T): void {
    setBounded(groupCensoredUsersCache, chatId, data);
}

export function invalidateGroupCensoredUsers(chatId: string): void {
    groupCensoredUsersCache.delete(chatId);
}

export function invalidateAllDatabaseCaches(): void {
    subbotConfigCache.clear();
    groupContextSettingsCache.clear();
    groupFullSettingsCache.clear();
    groupCensoredUsersCache.clear();
    void Promise.all([
        clearRedisNamespace(DISTRIBUTED_DB_CACHE.subbot),
        clearRedisNamespace(DISTRIBUTED_DB_CACHE.groupContext),
    ]);
}

export function getDatabaseCacheStats() {
    return {
        ...stats,
        ttlMs: TTL_MS,
        entries: {
            subbots: subbotConfigCache.size,
            groupContext: groupContextSettingsCache.size,
            groupFull: groupFullSettingsCache.size,
            censoredUsers: groupCensoredUsersCache.size,
        },
    };
}

// Limpieza periódica de entradas expiradas (evita memory leak si miles de chats únicos).
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of subbotConfigCache.entries()) {
        if (now > v.expiresAt) subbotConfigCache.delete(k);
    }
    for (const [k, v] of groupContextSettingsCache.entries()) {
        if (now > v.expiresAt) groupContextSettingsCache.delete(k);
    }
    for (const [k, v] of groupFullSettingsCache.entries()) {
        if (now > v.expiresAt) groupFullSettingsCache.delete(k);
    }
    for (const [k, v] of groupCensoredUsersCache.entries()) {
        if (now > v.expiresAt) groupCensoredUsersCache.delete(k);
    }
}, 5 * 60_000).unref?.();
