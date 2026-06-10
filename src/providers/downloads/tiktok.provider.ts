import fg from 'api-dylux';
import cheerio from 'cheerio';
import {httpJson, httpText} from '../../lib/http-client.js';
import {runProviderCandidates, type ProviderCandidate, type ProviderResult} from '../provider.types.js';

interface TikTokMedia {
    type?: string;
    org?: string;
    hd?: string;
    wm?: string;
}

interface TikDownResponse {
    status?: boolean;
    html?: string;
}

interface TikTokSearchItem {
    hd?: string;
}

interface TikTokSearchResponse {
    meta?: TikTokSearchItem[];
}

export interface TikTokProviderMedia {
    url: string;
    mimetype: 'video/mp4';
    fileName: string;
}

export const tiktokUrlRegex = /(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/i;

export function isTikTokUrl(input: string): boolean {
    return tiktokUrlRegex.test(input);
}

export function buildTikTokDownloadProviders(videoUrl: string): ProviderCandidate<string>[] {
    return [
        {
            name: 'tikdown',
            run: async () => {
                const media = await downloadWithTikdown(videoUrl);
                return media.video;
            },
        },
        {
            name: 'delirius-tiktok',
            run: async () => {
                const data = await httpJson<{data?: {meta?: {media?: TikTokMedia[]}}}>(`https://api.delirius.store/download/tiktok?url=${encodeURIComponent(videoUrl)}`);
                const video = data.data?.meta?.media?.find(media => media.type === 'video');
                return video?.org || video?.hd || video?.wm;
            },
        },
        {
            name: 'dorratz-tiktok',
            run: async () => {
                const response = await httpJson<{data?: {media?: {org?: string}}}>(`https://api.dorratz.com/v2/tiktok-dl?url=${encodeURIComponent(videoUrl)}`);
                return response.data?.media?.org;
            },
        },
        {
            name: 'api-dylux-tiktok',
            run: async () => {
                const data = await fg.tiktok(videoUrl) as {nowm?: string};
                return data.nowm;
            },
        },
    ];
}

export async function resolveTikTokDownloadUrl(videoUrl: string): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildTikTokDownloadProviders(videoUrl));
}

export async function downloadTikTokVideo(videoUrl: string): Promise<ProviderResult<TikTokProviderMedia>> {
    const result = await resolveTikTokDownloadUrl(videoUrl);
    return {
        data: result.data
            ? {
                url: result.data,
                mimetype: 'video/mp4',
                fileName: 'tt.mp4',
            }
            : null,
        failures: result.failures,
    };
}

export async function searchTikTokVideos(query: string, limit = 5): Promise<TikTokProviderMedia[]> {
    const response = await httpJson<TikTokSearchResponse>(`${info.apis}/search/tiktoksearch?query=${encodeURIComponent(query)}`);
    const results = response.meta?.filter(item => item.hd).slice(0, limit) || [];

    return results.map((item, index) => ({
        url: item.hd!,
        mimetype: 'video/mp4',
        fileName: `tiktok-${index + 1}.mp4`,
    }));
}

async function downloadWithTikdown(url: string): Promise<{video?: string; audio?: string; thumbnail?: string}> {
    if (!isTikTokUrl(url)) throw new Error('URL de TikTok invalida');

    const tokenHtml = await httpText('https://tikdown.org/id');
    const $ = cheerio.load(tokenHtml);
    const token = $('#download-form > input[type=hidden]:nth-child(2)').attr('value');
    const data = await httpJson<TikDownResponse>('https://tikdown.org/getAjax?', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
        },
        body: new URLSearchParams({url, _token: token || ''}),
    });
    const parsed = cheerio.load(data.html || '');

    return data.status
        ? {
            thumbnail: parsed('img').attr('src'),
            video: parsed('div.download-links > div:nth-child(1) > a').attr('href'),
            audio: parsed('div.download-links > div:nth-child(2) > a').attr('href'),
        }
        : {};
}
