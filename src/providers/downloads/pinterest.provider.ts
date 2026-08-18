import {externalApis} from '../external-api-config.js';
import {httpJson} from '../../lib/http-client.js';
import {pinterest} from '../legacy-scrapers/download.scraper.js';
import {DEFAULT_PROVIDER_TIMEOUT_MS, LONG_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export interface PinterestProviderPin {
    title: string;
    image: string;
}

interface ScraperPin {
    title?: string;
    uploader?: {username?: string};
    media?: {images?: {orig?: {url?: string}}};
}

interface SiputzPinterestItem {
    grid_title?: string;
    images_url?: string;
}

interface DorratzPinterestItem {
    fullname?: string;
    upload_by?: string;
    followers?: string | number;
    image?: string;
}

interface MainPinterestItem {
    description?: string;
    name?: string;
    username?: string;
    image?: string;
}

export function buildPinterestSearchProviders(query: string): ProviderCandidate<PinterestProviderPin[]>[] {
    return withProviderPolicy([
        {
            name: 'scraper-pinterest',
            timeoutMs: LONG_PROVIDER_TIMEOUT_MS,
            run: async () => {
                const response = await pinterest.search(query, 6);
                const pins = (response.result.pins as ScraperPin[]).slice(0, 5);
                const results = pins.map(pin => ({
                    title: pin.title || query,
                    image: pin.media?.images?.orig?.url || '',
                })).filter(result => result.image);
                return results.length ? results : null;
            },
        },
        {
            name: 'siputz-pinterest',
            run: async () => {
                const res = await httpJson<{data?: SiputzPinterestItem[]}>(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
                const data = (res.data || []).slice(0, 5);
                const results = data.map(result => ({
                    title: result.grid_title || query,
                    image: result.images_url || '',
                })).filter(result => result.image);
                return results.length ? results : null;
            },
        },
        {
            name: 'dorratz-pinterest',
            run: async () => {
                const res = await httpJson<DorratzPinterestItem[]>(`https://api.dorratz.com/v2/pinterest?q=${encodeURIComponent(query)}`);
                const data = res.slice(0, 5);
                const results = data.map(result => ({
                    title: result.fullname || query,
                    image: result.image || '',
                })).filter(result => result.image);
                return results.length ? results : null;
            },
        },
        {
            name: 'main-pinterest',
            run: async () => {
                const res = await httpJson<{data?: MainPinterestItem[]}>(`${externalApis.main.url}/search/pinterestv2?text=${encodeURIComponent(query)}`);
                const data = (res.data || []).slice(0, 5);
                const results = data.map(result => ({
                    title: result.description || query,
                    image: result.image || '',
                })).filter(result => result.image);
                return results.length ? results : null;
            },
        },
    ], {timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function searchPinterest(query: string): Promise<ProviderResult<PinterestProviderPin[]>> {
    return runProviderCandidates(buildPinterestSearchProviders(query));
}
