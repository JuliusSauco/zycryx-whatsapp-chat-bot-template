import FormData from 'form-data';
import {ENV} from '../../core/env.js';
import {httpJson} from '../../lib/http-client.js';
import uploadFile, {
    catbox,
    filechan,
    gofile,
    krakenfiles,
    pixeldrain,
    quax,
    RESTfulAPI,
    telegraph,
    uguu,
} from '../../lib/uploadFile.js';
import uploadImage from '../../lib/uploadImage.js';

export type UploadService = (media: Buffer) => Promise<string | string[]>;

interface SkyUploadResponse {
    ok?: boolean;
    file?: {
        url?: string;
    };
    url?: string;
}

export const uploadServices: Record<string, UploadService> = {
    quax,
    restfulapi: RESTfulAPI,
    catbox,
    uguu,
    filechan,
    pixeldrain,
    gofile,
    krakenfiles,
    telegraph,
};

export function listUploadServiceNames(): string[] {
    return Object.keys(uploadServices).concat(['sky']);
}

export function isUploadServiceKey(option: string): option is keyof typeof uploadServices {
    return option in uploadServices;
}

export function normalizeUploadLink(link: string | string[]): string {
    return Array.isArray(link) ? link.join('\n') : link;
}

export async function uploadMedia(media: Buffer, mime: string, option = ''): Promise<string> {
    if (option === 'sky') return uploadToSky(media, mime);
    if (option && isUploadServiceKey(option)) return normalizeUploadLink(await uploadServices[option](media));

    const isTelegraphCompatible = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime);
    return await (isTelegraphCompatible ? uploadImage : uploadFile)(media);
}

async function uploadToSky(media: Buffer, mime: string): Promise<string> {
    if (!ENV.SKYULTRA_API_KEY) throw new Error('SKYULTRA_API_KEY no configurado');
    let ext = mime.split('/')[1] || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    const form = new FormData();
    form.append('name', 'archivo_bot');
    form.append('file', media, {
        filename: `upload.${ext}`,
        contentType: mime,
    });

    const json = await httpJson<SkyUploadResponse>('https://cdn.skyultraplus.com/upload.php', {
        method: 'POST',
        headers: {
            ...form.getHeaders(),
            'X-API-KEY': ENV.SKYULTRA_API_KEY,
        },
        body: form as never,
    });
    if (!json.ok) throw new Error(`SkyUltra upload failed: ${JSON.stringify(json)}`);
    const link = json.file?.url || json.url;
    if (!link) throw new Error('SkyUltra no devolvio URL');
    return link;
}
