import {httpJson} from '../../lib/http-client.js';
import {DEFAULT_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export interface SpotifyTrack {
    title: string;
    artist?: string;
    album?: string;
    duration?: string;
    publish?: string;
    image?: string;
    url: string;
}

interface SpotifySearchResponse {
    data?: SpotifyTrack[];
}

interface SpotifyDownloadResponse {
    data?: {
        download?: string;
        url?: string;
    };
}

export interface SpotifyProviderMedia {
    url: string;
    title: string;
    mimetype: 'audio/mpeg';
    fileName: string;
}

export async function searchSpotify(query: string): Promise<SpotifyTrack[]> {
    const response = await httpJson<SpotifySearchResponse>(`${info.apis}/search/spotify?q=${encodeURIComponent(query)}`);
    return response.data || [];
}

export function buildSpotifyDownloadProviders(trackUrl: string): ProviderCandidate<string>[] {
    return withProviderPolicy([
        {
            name: 'siputz-spotify',
            run: async () => {
                const data = await httpJson<SpotifyDownloadResponse>(`https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(trackUrl)}`);
                return data.data?.download;
            },
        },
        {
            name: 'main-spotify',
            run: async () => {
                const data = await httpJson<SpotifyDownloadResponse>(`${info.apis}/download/spotifydl?url=${encodeURIComponent(trackUrl)}`);
                return data.data?.url;
            },
        },
    ], {timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS, retries: 1});
}

export async function resolveSpotifyDownloadUrl(trackUrl: string): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildSpotifyDownloadProviders(trackUrl));
}

export async function downloadSpotifyTrack(track: SpotifyTrack): Promise<ProviderResult<SpotifyProviderMedia>> {
    const result = await resolveSpotifyDownloadUrl(track.url);
    return {
        data: result.data
            ? {
                url: result.data,
                title: track.title,
                mimetype: 'audio/mpeg',
                fileName: `${track.title || 'spotify'}.mp3`,
            }
            : null,
        failures: result.failures,
    };
}
