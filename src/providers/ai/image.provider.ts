import * as cheerio from 'cheerio';
import {ENV} from '../../core/env.js';
import {httpJson, httpText} from '../../lib/http-client.js';
import {LONG_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export type AiImageKind = 'generated' | 'search';

export interface AiImageResult {
    url: string | Buffer;
    kind: AiImageKind;
}

interface DorratzImageResponse {
    data?: {
        status?: string;
        image_link?: string;
    };
}

interface UnsplashResponse {
    results?: Array<{
        urls?: {
            regular?: string;
        };
    }>;
}

interface BetabotzImageResponse {
    result?: string[];
}

interface VihangaImagineResponse {
    data?: string;
}

export function buildAiImageProviders(prompt: string, getFile?: (url: string) => Promise<{data?: Buffer}>): ProviderCandidate<AiImageResult>[] {
    return withProviderPolicy<AiImageResult>([
        {
            name: 'dorratz-ai-image',
            run: async () => {
                const res = await httpJson<DorratzImageResponse>(`https://api.dorratz.com/v3/ai-image?prompt=${encodeURIComponent(prompt)}`);
                if (res.data?.status !== 'success' || !res.data.image_link) return null;
                return {url: res.data.image_link, kind: 'generated'};
            },
        },
        {
            name: 'flux-lusion',
            run: async () => {
                const url = await flux(prompt);
                return url ? {url, kind: 'generated'} : null;
            },
        },
        {
            name: 'unsplash-search',
            run: async () => {
                if (!ENV.UNSPLASH_ACCESS_KEY) return null;
                const response = await httpJson<UnsplashResponse>(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(prompt)}&client_id=${ENV.UNSPLASH_ACCESS_KEY}`);
                const imageUrl = response.results?.[0]?.urls?.regular;
                return imageUrl ? {url: imageUrl, kind: 'search'} : null;
            },
        },
        {
            name: 'betabotz-bing-image',
            run: async () => {
                if (!ENV.BETABOTZ_API_KEY) return null;
                const response = await httpJson<BetabotzImageResponse>(`https://api.betabotz.eu.org/api/search/bing-img?text=${encodeURIComponent(prompt)}&apikey=${ENV.BETABOTZ_API_KEY}`);
                const imageUrl = response.result?.[0];
                return imageUrl ? {url: imageUrl, kind: 'search'} : null;
            },
        },
        {
            name: 'vihanga-imagine',
            run: async () => {
                const json = await httpJson<VihangaImagineResponse>(`https://vihangayt.me/tools/imagine?q=${encodeURIComponent(prompt)}`);
                return json.data ? {url: json.data, kind: 'search'} : null;
            },
        },
        {
            name: 'lolhuman-dalle',
            run: async () => {
                if (!ENV.LOLHUMAN_API_KEY || !getFile) return null;
                const file = await getFile(`https://api.lolhuman.xyz/api/dall-e?apikey=${ENV.LOLHUMAN_API_KEY}&text=${encodeURIComponent(prompt)}`);
                return file.data ? {url: file.data, kind: 'search'} : null;
            },
        },
    ], {timeoutMs: LONG_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function generateAiImage(prompt: string, getFile?: (url: string) => Promise<{data?: Buffer}>): Promise<ProviderResult<AiImageResult>> {
    return runProviderCandidates(buildAiImageProviders(prompt, getFile));
}

async function flux(prompt: string): Promise<string | null> {
    const url = `https://lusion.regem.in/access/flux.php?prompt=${encodeURIComponent(prompt)}`;
    const html = await httpText(url, {
        headers: {
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
            Referer: 'https://lusion.regem.in/?ref=taaft&utm_source=taaft&utm_medium=referral',
        },
    });
    const $ = cheerio.load(html);
    return $('a.btn-navy.btn-sm.mt-2').attr('href') || null;
}
