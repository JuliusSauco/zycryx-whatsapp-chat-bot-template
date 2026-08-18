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

function setBounded<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    cache.delete(key);
    while (cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = cache.keys().next().value as string | undefined;
        if (!oldest) break;
        cache.delete(oldest);
    }
    cache.set(key, {data, expiresAt: Date.now() + TTL_MS});
}

export function getCachedSubbotConfig<T>(botId: string): T | null {
    const entry = subbotConfigCache.get(botId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        subbotConfigCache.delete(botId);
        return null;
    }
    return entry.data as T;
}

export function setCachedSubbotConfig<T>(botId: string, data: T): void {
    setBounded(subbotConfigCache, botId, data);
}

export function invalidateSubbotConfig(botId: string): void {
    subbotConfigCache.delete(botId);
}

export function getCachedGroupSettings<T>(chatId: string): T | null {
    const entry = groupContextSettingsCache.get(chatId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        groupContextSettingsCache.delete(chatId);
        return null;
    }
    return entry.data as T;
}

export function setCachedGroupSettings<T>(chatId: string, data: T): void {
    setBounded(groupContextSettingsCache, chatId, data);
}

export function getCachedFullGroupSettings<T>(chatId: string): T | null {
    const entry = groupFullSettingsCache.get(chatId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        groupFullSettingsCache.delete(chatId);
        return null;
    }
    return entry.data as T;
}

export function setCachedFullGroupSettings<T>(chatId: string, data: T): void {
    setBounded(groupFullSettingsCache, chatId, data);
}

export function invalidateGroupSettings(chatId: string): void {
    groupContextSettingsCache.delete(chatId);
    groupFullSettingsCache.delete(chatId);
}

export function getCachedGroupCensoredUsers<T>(chatId: string): T | null {
    const entry = groupCensoredUsersCache.get(chatId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        groupCensoredUsersCache.delete(chatId);
        return null;
    }
    return entry.data as T;
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
