import {readFile} from 'fs/promises';
import path from 'path';
import {getCachedJson} from './static-resource-cache.js';

const stringArrayCache = new Map<string, string[]>();
const MAX_RESOURCE_FILES = 250;

export async function loadJsonResource<T>(relativePath: string): Promise<T> {
    const fullPath = path.resolve(process.cwd(), relativePath);
    const raw = await readFile(fullPath, 'utf8');
    return JSON.parse(raw) as T;
}

export function loadCachedJsonResource<T>(relativePath: string): T | null {
    return getCachedJson<T>(path.resolve(process.cwd(), relativePath));
}

export async function loadStringArrayResource(relativePath: string): Promise<string[]> {
    const fullPath = path.resolve(process.cwd(), relativePath);
    const cached = stringArrayCache.get(fullPath);
    if (cached) return cached;

    const value: unknown = await loadJsonResource<unknown>(relativePath);
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
        throw new Error(`JSON resource must be a string array: ${relativePath}`);
    }

    while (stringArrayCache.size >= MAX_RESOURCE_FILES) {
        const oldest = stringArrayCache.keys().next().value as string | undefined;
        if (!oldest) break;
        stringArrayCache.delete(oldest);
    }
    stringArrayCache.set(fullPath, value);
    return value;
}
