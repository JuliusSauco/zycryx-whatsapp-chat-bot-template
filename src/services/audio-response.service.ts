import {logError} from '../lib/logger.js';
import fs from 'fs';
import path from 'path';
import {repositories} from './data-source.js';
import {ENV} from '../core/env.js';

export interface AudioEntry {
    regex: string;
    audio?: string;
    audios?: string[];
}

export type AudioConfig = Record<string, Record<string, AudioEntry>>;

const seedAudiosPath = path.resolve('./resources/data/audios.json');
let seedCache: AudioConfig | null = null;
const audioConfigCache = new Map<string, {data: AudioConfig; expiresAt: number}>();
const regexCache = new Map<string, RegExp | null>();
const AUDIO_CACHE_TTL_MS = Number.isFinite(ENV.AUDIO_CACHE_TTL_MS) && ENV.AUDIO_CACHE_TTL_MS > 0
    ? ENV.AUDIO_CACHE_TTL_MS
    : 300_000;

function normalizeEntry(entry: AudioEntry): AudioEntry {
    const audios = entry.audios?.length ? entry.audios : entry.audio ? [entry.audio] : [];
    return {
        regex: entry.regex,
        ...(audios.length === 1 ? {audio: audios[0]} : {}),
        ...(audios.length > 1 ? {audios} : {}),
    };
}

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

function mergeDynamicAudios(base: AudioConfig, records: Awaited<ReturnType<typeof repositories.audioResponses.listAll>>): AudioConfig {
    for (const record of records) {
        if (!base[record.scope]) base[record.scope] = {};

        if (record.deleted) {
            delete base[record.scope][record.phrase];
            continue;
        }

        base[record.scope][record.phrase] = normalizeEntry({
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
    const audios = entry.audios?.length ? entry.audios : entry.audio ? [entry.audio] : [];
    await repositories.audioResponses.upsert({
        scope,
        phrase,
        regex: entry.regex,
        audioUrls: audios,
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
    if (Date.now() > cached.expiresAt) {
        audioConfigCache.delete(cacheKey);
        return null;
    }
    return structuredClone(cached.data);
}

function setCachedAudioConfig(cacheKey: string, data: AudioConfig): void {
    audioConfigCache.set(cacheKey, {
        data: structuredClone(data),
        expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
    });
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
