import {readFile} from 'fs/promises';
import path from 'path';

const stringArrayCache = new Map<string, string[]>();

export async function loadStringArrayResource(relativePath: string): Promise<string[]> {
    const fullPath = path.resolve(process.cwd(), relativePath);
    const cached = stringArrayCache.get(fullPath);
    if (cached) return cached;

    const raw = await readFile(fullPath, 'utf8');
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
        throw new Error(`JSON resource must be a string array: ${relativePath}`);
    }

    stringArrayCache.set(fullPath, value);
    return value;
}
