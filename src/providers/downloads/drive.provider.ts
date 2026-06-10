import {httpJson} from '../../lib/http-client.js';
import {runProviderCandidates, type ProviderCandidate, type ProviderResult} from '../provider.types.js';

interface SiputzDriveResponse {
    data?: {
        download?: string;
        name?: string;
    };
}

interface DavidDriveResponse {
    download_link?: string;
    name?: string;
}

export interface DriveProviderFile {
    url: string;
    filename: string;
    mimetype: string;
}

export function buildDriveDownloadProviders(fileUrl: string): ProviderCandidate<Omit<DriveProviderFile, 'mimetype'>>[] {
    return [
        {
            name: 'siputz-gdrive',
            run: async () => {
                const data = await httpJson<SiputzDriveResponse>(`https://api.siputzx.my.id/api/d/gdrive?url=${encodeURIComponent(fileUrl)}`);
                return data.data?.download && data.data.name
                    ? {url: data.data.download, filename: data.data.name}
                    : null;
            },
        },
        {
            name: 'david-cyril-gdrive',
            run: async () => {
                const data = await httpJson<DavidDriveResponse>(`https://apis.davidcyriltech.my.id/gdrive?url=${encodeURIComponent(fileUrl)}`);
                return data.download_link && data.name
                    ? {url: data.download_link, filename: data.name}
                    : null;
            },
        },
    ];
}

export async function downloadDriveFile(fileUrl: string): Promise<ProviderResult<DriveProviderFile>> {
    const result = await runProviderCandidates(buildDriveDownloadProviders(fileUrl));
    return {
        data: result.data
            ? {
                ...result.data,
                mimetype: getFileMimetype(result.data.filename),
            }
            : null,
        failures: result.failures,
    };
}

export function getFileMimetype(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        mp4: 'video/mp4',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        zip: 'application/zip',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        mp3: 'audio/mpeg',
        apk: 'application/vnd.android.package-archive',
        rar: 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        mkv: 'video/x-matroska',
        avi: 'video/x-msvideo',
        mov: 'video/quicktime',
        wmv: 'video/x-ms-wmv',
        flv: 'video/x-flv',
        gif: 'image/gif',
        webp: 'image/webp',
        ogg: 'audio/ogg',
        wav: 'audio/wav',
    };
    return mimeTypes[extension] || 'application/octet-stream';
}
