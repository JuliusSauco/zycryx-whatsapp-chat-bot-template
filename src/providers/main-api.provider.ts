import {ENV} from '../core/env.js';
import {httpJson} from '../lib/http-client.js';
import {runFirstProvider} from '../lib/provider-fallback.js';
import {externalApis} from './external-api-config.js';

export interface CountryLookupResult { name?: string; emoji?: string }
export interface GoogleSearchResult {
    title?: string;
    url?: string;
    formattedUrl?: string;
    description?: string;
    snippet?: string;
}

interface CountryResponse { result?: CountryLookupResult }
interface GoogleSearchResponse { status?: boolean; data?: GoogleSearchResult[] }

export async function lookupCountry(phone: string): Promise<CountryLookupResult | null> {
    const data = await httpJson<CountryResponse>(`${externalApis.main.url}/tools/country?text=${encodeURIComponent(phone)}`);
    return data.result ?? null;
}

export function buildLevelCardUrl(input: {
    avatarUrl: string;
    backgroundUrl: string;
    username: string;
    discriminator: string;
    money: number;
    xp: number;
    level: number;
}): string {
    const params = new URLSearchParams({
        url: input.avatarUrl,
        background: input.backgroundUrl,
        username: input.username,
        discriminator: input.discriminator,
        money: String(input.money),
        xp: String(input.xp),
        level: String(input.level),
    });
    return `${externalApis.main.url}/canvas/balcard?${params.toString()}`;
}

export function searchGoogle(query: string): Promise<GoogleSearchResult[]> {
    return runFirstProvider([
        {
            name: 'main-google',
            run: async () => {
                const data = await httpJson<GoogleSearchResponse>(`${externalApis.main.url}/search/googlesearch?query=${encodeURIComponent(query)}`);
                return data.status && data.data?.length ? data.data : null;
            },
        },
        {
            name: 'alyachan-google',
            run: async () => {
                if (!ENV.ALYACHAN_API_KEY) return null;
                const data = await httpJson<GoogleSearchResponse>(`https://api.alyachan.dev/api/google?q=${encodeURIComponent(query)}&apikey=${ENV.ALYACHAN_API_KEY}`);
                return data.status && data.data?.length ? data.data : null;
            },
        },
    ], 'No se encontraron resultados en Google.');
}
