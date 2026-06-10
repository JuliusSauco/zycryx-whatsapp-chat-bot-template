import fg from 'api-dylux';
import {httpJson} from '../../lib/http-client.js';
import {runProviderCandidates, type ProviderCandidate, type ProviderResult} from '../provider.types.js';

interface AgatzFacebookResponse {
    data?: {
        hd?: string;
        sd?: string;
        thumbnail?: string;
    };
}

interface FgmodsFacebookResponse {
    result?: Array<{
        hd?: string;
        sd?: string;
    }>;
}

interface DeliusFacebookResponse {
    urls?: Array<{
        hd?: string;
        sd?: string;
    }>;
}

interface DorratzFacebookResponse {
    result?: {
        hd?: string;
        sd?: string;
    };
}

export interface FacebookProviderMedia {
    type: 'video' | 'image';
    url: string;
    fileName: string;
    captionVariant?: 'default' | 'bold';
}

export const facebookUrlRegex = /(?:www\.facebook\.com|facebook\.com|fb\.watch)/i;

export function isFacebookUrl(input: string): boolean {
    return facebookUrlRegex.test(input);
}

export function buildFacebookDownloadProviders(postUrl: string): ProviderCandidate<FacebookProviderMedia>[] {
    return [
        {
            name: 'agatz-facebook',
            run: async () => {
                const data = await httpJson<AgatzFacebookResponse>(`https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(postUrl)}`);
                const videoUrl = data.data?.hd || data.data?.sd;
                const imageUrl = data.data?.thumbnail;
                if (videoUrl && videoUrl.endsWith('.mp4')) return {type: 'video', url: videoUrl, fileName: 'video.mp4'};
                if (imageUrl && (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.png'))) return {type: 'image', url: imageUrl, fileName: 'thumbnail.jpg'};
                return null;
            },
        },
        {
            name: 'fgmods-facebook',
            run: async () => {
                const data = await httpJson<FgmodsFacebookResponse>(`${info.fgmods.url}/downloader/fbdl?url=${encodeURIComponent(postUrl)}&apikey=${info.fgmods.key}`);
                const url = data.result?.[0]?.hd || data.result?.[0]?.sd;
                return url ? {type: 'video', url, fileName: 'video.mp4'} : null;
            },
        },
        {
            name: 'main-facebook',
            run: async () => {
                const data = await httpJson<DeliusFacebookResponse>(`${info.apis}/download/facebook?url=${encodeURIComponent(postUrl)}`);
                const url = data.urls?.[0]?.hd || data.urls?.[0]?.sd;
                return url ? {type: 'video', url, fileName: 'video.mp4'} : null;
            },
        },
        {
            name: 'dorratz-facebook',
            run: async () => {
                const data = await httpJson<DorratzFacebookResponse>(`https://api.dorratz.com/fbvideo?url=${encodeURIComponent(postUrl)}`);
                const url = data.result?.hd || data.result?.sd;
                return url ? {type: 'video', url, fileName: 'video.mp4'} : null;
            },
        },
        {
            name: 'api-dylux-facebook',
            run: async () => {
                const data = await fg.fbdl(postUrl) as {data?: Array<{url?: string}>};
                const url = data.data?.[0]?.url;
                return url ? {type: 'video', url, fileName: 'video.mp4', captionVariant: 'bold'} : null;
            },
        },
    ];
}

export function downloadFacebookMedia(postUrl: string): Promise<ProviderResult<FacebookProviderMedia>> {
    return runProviderCandidates(buildFacebookDownloadProviders(postUrl));
}
