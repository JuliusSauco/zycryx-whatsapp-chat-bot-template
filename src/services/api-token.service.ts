import {logError} from '../lib/logger.js';
import {repositories} from './data-source.js';

const tokenCache = new Map<string, string | null>();

export async function getDecodedApiToken(name: string): Promise<string | null> {
    if (tokenCache.has(name)) return tokenCache.get(name)!;

    let token: string | null = null;
    try {
        token = await repositories.apiTokens.findToken(name);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logError(`[API_TOKEN] error leyendo token '${name}':`, message);
    }

    tokenCache.set(name, token);
    return token;
}

export async function setEncryptedApiToken(name: string, token: string): Promise<void> {
    if (!name.trim() || !token.trim()) throw new Error('El nombre y el token son obligatorios.');
    await repositories.apiTokens.upsertToken(name.trim(), token.trim());
    invalidateApiTokenCache(name.trim());
}

export function invalidateApiTokenCache(name?: string): void {
    if (name) tokenCache.delete(name);
    else tokenCache.clear();
}
