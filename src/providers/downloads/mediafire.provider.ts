import {httpJson} from '../../lib/http-client.js';
import {runProviderCandidates, type ProviderCandidate, type ProviderResult} from '../provider.types.js';

interface MediafireArrayResponse {
    data?: Array<{
        link?: string;
        filename?: string;
        nama?: string;
        size?: string;
        mime?: string;
    }>;
}

interface NeoxrMediafireResponse {
    status?: boolean;
    data?: {
        url?: string;
        title?: string;
        size?: string;
        mime?: string;
    };
}

export interface MediafireProviderFile {
    url: string;
    filename: string;
    filesize?: string;
    mimetype?: string;
}

export function buildMediafireDownloadProviders(fileUrl: string): ProviderCandidate<MediafireProviderFile>[] {
    return [
        {
            name: 'delirius-mediafire',
            run: async () => {
                const data = await httpJson<MediafireArrayResponse>(`https://api.delirius.store/download/mediafire?url=${encodeURIComponent(fileUrl)}`);
                return mapMediafireArrayItem(data.data?.[0], 'filename');
            },
        },
        {
            name: 'neoxr-mediafire',
            run: async () => {
                const data = await httpJson<NeoxrMediafireResponse>(`${info.neoxr.url}/mediafire?url=${encodeURIComponent(fileUrl)}&apikey=${info.neoxr.key}`);
                if (!data.status || !data.data?.url || !data.data.title) return null;
                return {
                    url: data.data.url,
                    filename: data.data.title,
                    filesize: data.data.size,
                    mimetype: data.data.mime,
                };
            },
        },
        {
            name: 'agatz-mediafire',
            run: async () => {
                const data = await httpJson<MediafireArrayResponse>(`https://api.agatz.xyz/api/mediafire?url=${encodeURIComponent(fileUrl)}`);
                return mapMediafireArrayItem(data.data?.[0], 'nama');
            },
        },
        {
            name: 'siputz-mediafire',
            run: async () => {
                const data = await httpJson<MediafireArrayResponse>(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(fileUrl)}`);
                return mapMediafireArrayItem(data.data?.[0], 'filename');
            },
        },
    ];
}

export function downloadMediafireFile(fileUrl: string): Promise<ProviderResult<MediafireProviderFile>> {
    return runProviderCandidates(buildMediafireDownloadProviders(fileUrl));
}

function mapMediafireArrayItem(
    file: NonNullable<MediafireArrayResponse['data']>[number] | undefined,
    filenameKey: 'filename' | 'nama',
): MediafireProviderFile | null {
    const filename = file?.[filenameKey];
    if (!file?.link || !filename) return null;
    return {
        url: file.link,
        filename,
        filesize: file.size,
        mimetype: file.mime,
    };
}
