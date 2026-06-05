import fs from 'fs';

type CacheEntry<T> = {
    mtimeMs: number;
    value: T;
};

const bufferCache = new Map<string, CacheEntry<Buffer>>();
const textCache = new Map<string, CacheEntry<string>>();
const jsonCache = new Map<string, CacheEntry<unknown>>();
const directoryCache = new Map<string, CacheEntry<string[]>>();

export function getCachedBuffer(filePath: string): Buffer | null {
    return getCachedFile(filePath, bufferCache, () => fs.readFileSync(filePath));
}

export function getCachedText(filePath: string): string | null {
    return getCachedFile(filePath, textCache, () => fs.readFileSync(filePath, 'utf-8'));
}

export function getCachedJson<T>(filePath: string): T | null {
    return getCachedFile(filePath, jsonCache, () => JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T) as T | null;
}

export function getCachedDirectoryFiles(dirPath: string, filter?: (fileName: string) => boolean): string[] {
    const files = getCachedFile(dirPath, directoryCache, () => fs.readdirSync(dirPath)) || [];
    return filter ? files.filter(filter) : files;
}

function getCachedFile<T>(filePath: string, cache: Map<string, CacheEntry<T>>, load: () => T): T | null {
    try {
        const stat = fs.statSync(filePath);
        const cached = cache.get(filePath);
        if (cached && cached.mtimeMs === stat.mtimeMs) return cached.value;

        const value = load();
        cache.set(filePath, {mtimeMs: stat.mtimeMs, value});
        return value;
    } catch {
        cache.delete(filePath);
        return null;
    }
}
