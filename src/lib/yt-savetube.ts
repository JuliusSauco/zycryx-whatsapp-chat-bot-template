import crypto from 'crypto';
import {HttpError, httpJson} from './http-client.js';

interface SavetubeResult {
    title: string;
    type: string;
    format: string;
    thumbnail: string;
    download: string;
    id: string;
    key: string;
    duration: number;
    quality: string;
    downloaded: boolean;
}

interface SavetubeResponse {
    status: boolean;
    code: number;
    result?: SavetubeResult;
    error?: string;
    available_fmt?: string[];
}

interface SavetubeRequestResponse {
    status: boolean;
    code: number;
    data?: unknown;
    error?: string;
}

interface SavetubeInfoData {
    data?: string;
}

interface SavetubeDownloadData {
    data?: {
        downloadUrl?: string;
        downloaded?: boolean;
    };
}

interface SavetubeDecryptedData {
    key: string;
    title?: string;
    thumbnail?: string;
    duration: number;
}

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
const getStatusCode = (error: unknown): number => {
    if (error instanceof HttpError) return error.status;
    return 500;
};

const savetube = {
    api: {
        base: "https://media.savetube.me/api",
        cdn: "/random-cdn",
        info: "/v2/info",
        download: "/download"
    },
    headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'origin': 'https://yt.savetube.me',
        'referer': 'https://yt.savetube.me/',
        'user-agent': 'Postify/1.0.0'
    },
    formats: ['144', '240', '360', '480', '720', '1080', 'mp3'],

    crypto: {
        hexToBuffer: (hexString: string): Buffer => {
            const matches = hexString.match(/.{1,2}/g);
            return Buffer.from(matches!.join(''), 'hex');
        },

        decrypt: async (enc: string): Promise<SavetubeDecryptedData> => {
            try {
                const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
                const data = Buffer.from(enc, 'base64');
                const iv = data.slice(0, 16);
                const content = data.slice(16);
                const key = savetube.crypto.hexToBuffer(secretKey);

                const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
                let decrypted = decipher.update(content);
                decrypted = Buffer.concat([decrypted, decipher.final()]);

                return JSON.parse(decrypted.toString()) as SavetubeDecryptedData;
            } catch (error: unknown) {
                throw new Error(getErrorMessage(error));
            }
        }
    },

    isUrl: (str: string): boolean => {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    },

    youtube: (url: string): string | null => {
        if (!url) return null;
        const a = [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/
        ];
        for (let b of a) {
            if (b.test(url)) return url.match(b)![1];
        }
        return null;
    },

    request: async (endpoint: string, data: Record<string, unknown> = {}, method: string = 'post'): Promise<SavetubeRequestResponse> => {
        try {
            const url = `${endpoint.startsWith('http') ? '' : savetube.api.base}${endpoint}`;
            const response = await httpJson<unknown>(method === 'get' ? withQuery(url, data) : url, {
                method: method.toUpperCase(),
                headers: savetube.headers,
                ...(method === 'post' ? {body: JSON.stringify(data)} : {}),
            });
            return {
                status: true,
                code: 200,
                data: response
            };
        } catch (error: unknown) {
            return {
                status: false,
                code: getStatusCode(error),
                error: getErrorMessage(error)
            };
        }
    },

    getCDN: async (): Promise<SavetubeRequestResponse> => {
        const response = await savetube.request(savetube.api.cdn, {}, 'get');
        if (!response.status) return response;
        return {
            status: true,
            code: 200,
            data: (response.data as {cdn?: string}).cdn
        };
    },

    download: async (link: string, format: string): Promise<SavetubeResponse> => {
        if (!link) {
            return {
                status: false,
                code: 400,
                error: "[ ❌ ] ¿Dónde está el link? No puedes descargar sin link "
            };
        }

        if (!savetube.isUrl(link)) {
            return {
                status: false,
                code: 400,
                error: "[ ❌ ] ¿Qué link pusiste? 🗿 Deberías poner un link de YouTube, si vas a descargar de ahí 👍🏻"
            };
        }

        if (!format || !savetube.formats.includes(format)) {
            return {
                status: false,
                code: 400,
                error: "*[ ❌ ] El formato no está disponible, elige uno de los que ya están disponibles, no busques lo que no hay 🗿*",
                available_fmt: savetube.formats
            };
        }

        const id = savetube.youtube(link);
        if (!id) {
            return {
                status: false,
                code: 400,
                error: "*[ ❌ ] No se puede extraer el enlace de YouTube, asegúrate de que el enlace sea el correcto para evitar esto nuevamente 😂*"
            };
        }

        try {
            const cdnx = await savetube.getCDN();
            if (!cdnx.status) return cdnx;
            const cdn = String(cdnx.data || '');

            const result = await savetube.request(`https://${cdn}${savetube.api.info}`, {
                url: `https://www.youtube.com/watch?v=${id}`
            });
            if (!result.status) return result;
            const infoData = result.data as SavetubeInfoData;
            if (!infoData.data) return {status: false, code: 500, error: 'Respuesta invalida de Savetube'};
            const decrypted = await savetube.crypto.decrypt(infoData.data);

            const dl = await savetube.request(`https://${cdn}${savetube.api.download}`, {
                id: id,
                downloadType: format === 'mp3' ? 'audio' : 'video',
                quality: format === 'mp3' ? '128' : format,
                key: decrypted.key
            });

            return {
                status: true,
                code: 200,
                result: {
                    title: decrypted.title || "Sin tittle",
                    type: format === 'mp3' ? 'audio' : 'video',
                    format: format,
                    thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
                    download: ((dl.data as SavetubeDownloadData).data?.downloadUrl) || '',
                    id: id,
                    key: decrypted.key,
                    duration: decrypted.duration,
                    quality: format === 'mp3' ? '128' : format,
                    downloaded: ((dl.data as SavetubeDownloadData).data?.downloaded) || false
                }
            };

        } catch (error: unknown) {
            return {
                status: false,
                code: 500,
                error: getErrorMessage(error)
            };
        }
    }
};

export {savetube};
export type {SavetubeResponse, SavetubeResult};

function withQuery(url: string, params: Record<string, unknown>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) query.set(key, String(value));
    }
    const separator = url.includes('?') ? '&' : '?';
    return query.size ? `${url}${separator}${query}` : url;
}
