import {logError, logInfo, logWarn} from '../lib/logger.js';
import fs from 'fs';
import path from 'path';
import {repositories} from './data-source.js';

export interface AudioEntry {
    regex: string;
    audio?: string;
    audios?: string[];
}

export type AudioConfig = Record<string, Record<string, AudioEntry>>;

const seedAudiosPath = path.resolve('./src/data/audios.json');
let seedCache: AudioConfig | null = null;

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
        logError('[❌] Error cargando src/data/audios.json:', e);
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
    const base = readSeedAudios();
    const records = scopes?.length
        ? await repositories.audioResponses.listByScopes(scopes)
        : await repositories.audioResponses.listAll();

    return mergeDynamicAudios(base, records);
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

export async function upsertAudioEntry(scope: string, phrase: string, entry: AudioEntry): Promise<void> {
    const audios = entry.audios?.length ? entry.audios : entry.audio ? [entry.audio] : [];
    await repositories.audioResponses.upsert({
        scope,
        phrase,
        regex: entry.regex,
        audioUrls: audios,
    });
}

export async function deleteAudioEntry(scope: string, phrase: string, regex?: string): Promise<void> {
    await repositories.audioResponses.markDeleted(scope, phrase, regex);
}
