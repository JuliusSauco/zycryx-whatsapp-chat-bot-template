import {instagramdl} from '@bochilteam/scraper';
import {httpJson, httpText} from '../../lib/http-client.js';
import {runProviderCandidates, type ProviderCandidate, type ProviderResult} from '../provider.types.js';

interface InstagramArrayResponse {
    data?: Array<{
        url?: string;
        type?: string;
    }>;
}

interface FgmodsInstagramResponse {
    result?: Array<{
        url?: string;
    }>;
}

export interface InstagramProviderMedia {
    url: string;
    type: 'video' | 'image';
    fileName: string;
    caption?: string;
}

export function inferInstagramMediaType(url: string, fallbackType?: string): 'video' | 'image' {
    if (fallbackType === 'image' || fallbackType === 'video') return fallbackType;
    return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.includes('.webp')
        ? 'image'
        : 'video';
}

export function buildInstagramDownloadProviders(postUrl: string): ProviderCandidate<InstagramProviderMedia>[] {
    return [
        {
            name: 'siputz-instagram',
            run: async () => {
                const data = await httpJson<InstagramArrayResponse>(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(postUrl)}`);
                const media = data.data?.[0];
                if (!media?.url) return null;
                const type = inferInstagramMediaType(media.url, media.type);
                return {url: media.url, type, fileName: type === 'image' ? 'ig.jpg' : 'ig.mp4'};
            },
        },
        {
            name: 'fgmods-instagram',
            run: async () => {
                const data = await httpJson<FgmodsInstagramResponse>(`${info.fgmods.url}/downloader/igdl?url=${encodeURIComponent(postUrl)}&apikey=${info.fgmods.key}`);
                const mediaUrl = data.result?.[0]?.url;
                if (!mediaUrl) return null;
                const type = inferInstagramMediaType(mediaUrl);
                return {url: mediaUrl, type, fileName: type === 'image' ? 'ig.jpg' : 'ig.mp4'};
            },
        },
        {
            name: 'main-instagram',
            run: async () => {
                const data = await httpJson<InstagramArrayResponse>(`${info.apis}/download/instagram?url=${encodeURIComponent(postUrl)}`);
                const media = data.data?.[0];
                if (!media?.url) return null;
                const type = inferInstagramMediaType(media.url, media.type);
                return {url: media.url, type, fileName: type === 'image' ? 'ig.jpg' : 'ig.mp4'};
            },
        },
        {
            name: 'bochil-instagram',
            run: async () => {
                const result = await instagramdl(postUrl) as Array<{url?: string}>;
                const mediaUrl = result[0]?.url;
                if (!mediaUrl) return null;
                const shortUrl = await httpText(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(postUrl)}`);
                const type = inferInstagramMediaType(mediaUrl);
                return {
                    url: mediaUrl,
                    type,
                    fileName: type === 'image' ? 'ig.jpg' : 'ig.mp4',
                    caption: `_${shortUrl}_`.trim(),
                };
            },
        },
    ];
}

export function downloadInstagramMedia(postUrl: string): Promise<ProviderResult<InstagramProviderMedia>> {
    return runProviderCandidates(buildInstagramDownloadProviders(postUrl));
}
