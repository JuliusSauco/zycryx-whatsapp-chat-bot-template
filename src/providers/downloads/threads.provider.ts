import {httpJson} from '../../lib/http-client.js';
import {runProviderCandidates, type ProviderCandidate, type ProviderResult} from '../provider.types.js';

interface ThreadsAgatzResponse {
    data?: {
        image_urls?: string[];
        video_urls?: string[];
    };
}

interface ThreadsFallbackResponse {
    status?: boolean;
    data?: Array<{
        url?: string;
        type?: 'image' | 'video' | string;
    }>;
}

export interface ThreadsProviderMedia {
    url: string;
    type: 'video' | 'image';
    fileName: string;
}

export function inferThreadsMediaType(url: string, fallbackType?: string): 'video' | 'image' {
    if (fallbackType === 'image' || fallbackType === 'video') return fallbackType;
    return url.includes('.webp') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')
        ? 'image'
        : 'video';
}

export function buildThreadsDownloadProviders(postUrl: string): ProviderCandidate<ThreadsProviderMedia>[] {
    return [
        {
            name: 'agatz-threads',
            run: async () => {
                const data = await httpJson<ThreadsAgatzResponse>(`https://api.agatz.xyz/api/threads?url=${encodeURIComponent(postUrl)}`);
                const mediaUrl = data.data?.image_urls?.[0] || data.data?.video_urls?.[0];
                if (!mediaUrl) return null;
                const type = inferThreadsMediaType(mediaUrl);
                return {url: mediaUrl, type, fileName: type === 'image' ? 'threads_image.jpg' : 'threads_video.mp4'};
            },
        },
        {
            name: 'main-threads',
            run: async () => {
                const data = await httpJson<ThreadsFallbackResponse>(`${info.apis}/download/threads?url=${encodeURIComponent(postUrl)}`);
                const media = data.status ? data.data?.[0] : undefined;
                if (!media?.url) return null;
                const type = inferThreadsMediaType(media.url, media.type);
                return {url: media.url, type, fileName: type === 'image' ? 'threads_image.jpg' : 'threads_video.mp4'};
            },
        },
    ];
}

export function downloadThreadsMedia(postUrl: string): Promise<ProviderResult<ThreadsProviderMedia>> {
    return runProviderCandidates(buildThreadsDownloadProviders(postUrl));
}
