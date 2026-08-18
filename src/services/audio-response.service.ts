import {logError} from '../lib/logger.js';
import fs from 'fs';
import path from 'path';
import {repositories} from './data-source.js';
import {ENV} from '../core/env.js';
import type {AudioConfig, AudioEntry, AudioResponseRecord} from '../domain/audio-responses.js';
import {getAudioUrls, normalizeAudioEntry} from '../domain/audio-responses.js';
import {BoundedTtlCache} from '../lib/bounded-ttl-cache.js';

const seedAudiosPath = path.resolve('./resources/data/audios.json');
let seedCache: AudioConfig | null = null;
const regexCache = new BoundedTtlCache<string, RegExp | null>({ttlMs: 60 * 60_000, maxEntries: 2_000});
const AUDIO_CACHE_TTL_MS = Number.isFinite(ENV.AUDIO_CACHE_TTL_MS) && ENV.AUDIO_CACHE_TTL_MS > 0
    ? ENV.AUDIO_CACHE_TTL_MS
    : 300_000;
const audioConfigCache = new BoundedTtlCache<string, AudioConfig>({ttlMs: AUDIO_CACHE_TTL_MS, maxEntries: 250});

function readSeedAudios(): AudioConfig {
    if (seedCache) return structuredClone(seedCache);

    try {
        seedCache = JSON.parse(fs.readFileSync(seedAudiosPath, 'utf-8')) as AudioConfig;
    } catch (e: unknown) {
        logError('[❌] Error cargando resources/data/audios.json:', e);
        seedCache = {};
    }

    return structuredClone(seedCache);
}

function mergeDynamicAudios(base: AudioConfig, records: AudioResponseRecord[]): AudioConfig {
    for (const record of records) {
        if (!base[record.scope]) base[record.scope] = {};

        if (record.deleted) {
            delete base[record.scope][record.phrase];
            continue;
        }

        base[record.scope][record.phrase] = normalizeAudioEntry({
            regex: record.regex,
            audios: record.audioUrls,
        });
    }

    return base;
}

export async function getAudioConfig(scopes?: string[]): Promise<AudioConfig> {
    const cacheKey = buildAudioCacheKey(scopes);
    const cached = getCachedAudioConfig(cacheKey);
    if (cached) return cached;

    const base = readSeedAudios();
    const records = scopes?.length
        ? await repositories.audioResponses.listByScopes(scopes)
        : await repositories.audioResponses.listAll();

    const merged = mergeDynamicAudios(base, records);
    setCachedAudioConfig(cacheKey, merged);
    return structuredClone(merged);
}

export async function getAudioEntry(scope: string, phrase: string): Promise<AudioEntry | null> {
    const audios = await getAudioConfig([scope]);
    return audios[scope]?.[phrase] || null;
}

export async function findAudioEntryInScopes(scopes: string[], phrase: string): Promise<{scope: string; entry: AudioEntry} | null> {
    const audios = await getAudioConfig(scopes);

    for (const scope of scopes) {
        const entry = audios[scope]?.[phrase];
        if (entry) return {scope, entry};
    }

    return null;
}

export async function findMatchingAudioInScopes(scopes: string[], text: string): Promise<AudioEntry | null> {
    const audios = await getAudioConfig(scopes);

    for (const scope of scopes) {
        const source = audios[scope];
        if (!source) continue;

        for (const entry of Object.values(source)) {
            const regex = getCompiledRegex(entry.regex);
            if (!regex) continue;

            const matches = text.match(regex);
            if (matches?.[0]?.length === text.length) return entry;
        }
    }

    return null;
}

export async function upsertAudioEntry(scope: string, phrase: string, entry: AudioEntry): Promise<void> {
    await repositories.audioResponses.upsert({
        scope,
        phrase,
        regex: entry.regex,
        audioUrls: getAudioUrls(entry),
    });
    invalidateAudioConfig();
}

export async function deleteAudioEntry(scope: string, phrase: string, regex?: string): Promise<void> {
    await repositories.audioResponses.markDeleted(scope, phrase, regex);
    invalidateAudioConfig();
}

function buildAudioCacheKey(scopes?: string[]): string {
    return scopes?.length ? [...new Set(scopes)].sort().join('\u0000') : '*';
}

function getCachedAudioConfig(cacheKey: string): AudioConfig | null {
    const cached = audioConfigCache.get(cacheKey);
    if (!cached) return null;
    return structuredClone(cached);
}

function setCachedAudioConfig(cacheKey: string, data: AudioConfig): void {
    audioConfigCache.set(cacheKey, structuredClone(data));
}

function invalidateAudioConfig(): void {
    audioConfigCache.clear();
    regexCache.clear();
}

function getCompiledRegex(pattern: string): RegExp | null {
    if (regexCache.has(pattern)) return regexCache.get(pattern) ?? null;

    try {
        const regex = new RegExp(pattern, 'i');
        regexCache.set(pattern, regex);
        return regex;
    } catch {
        regexCache.set(pattern, null);
        return null;
    }
}
