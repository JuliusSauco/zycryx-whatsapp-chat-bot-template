import {repositories} from './data-source.js';

const tokenCache = new Map<string, string | null>();

export async function getDecodedApiToken(name: string): Promise<string | null> {
    if (tokenCache.has(name)) return tokenCache.get(name)!;

    let token: string | null = null;
    try {
        const tokenB64 = await repositories.apiTokens.findTokenB64(name);
        if (tokenB64) {
            token = Buffer.from(tokenB64, 'base64').toString('utf8').trim();
        }
    } catch (e: any) {
        console.error(`[API_TOKEN] error leyendo token '${name}':`, e?.message || e);
    }

    tokenCache.set(name, token);
    return token;
}

export function invalidateApiTokenCache(name?: string): void {
    if (name) tokenCache.delete(name);
    else tokenCache.clear();
}
