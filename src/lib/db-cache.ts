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
    subbotConfigCache.set(botId, {data, expiresAt: Date.now() + TTL_MS});
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
    groupContextSettingsCache.set(chatId, {data, expiresAt: Date.now() + TTL_MS});
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
    groupFullSettingsCache.set(chatId, {data, expiresAt: Date.now() + TTL_MS});
}

export function invalidateGroupSettings(chatId: string): void {
    groupContextSettingsCache.delete(chatId);
    groupFullSettingsCache.delete(chatId);
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
}, 5 * 60_000).unref?.();
