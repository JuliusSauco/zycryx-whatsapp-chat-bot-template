import {logError, logInfo, logWarn} from '../../lib/logger.js';
import WebSocket from "ws";
import axios from 'axios';
import {createHash} from 'crypto';
import {wrapper} from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import {CookieJar} from 'tough-cookie';
import {ENV} from '../../core/env.js';
import {httpText} from '../../lib/http-client.js';
import {pickRandom, randomInt} from '../../utils/random.js';

type UnknownRecord = Record<string, unknown>;
type ChatMessage = {role: string; content: string; id?: string};
type ScraperResult = UnknownRecord & {
    status?: boolean;
    code?: number;
    success?: boolean;
    error?: string;
    data?: UnknownRecord & {response?: string};
    result?: UnknownRecord & {
        pins?: unknown;
        title?: string;
        type?: string;
        download?: string;
        thumbnail?: string;
    };
};
type BlackboxResult = ScraperResult & {
    data: UnknownRecord & {response: string; source?: unknown[]};
    error?: string;
};
type PinterestSearchResult = ScraperResult & {
    result: UnknownRecord & {pins: unknown[]};
};
type DownloadScraperResult = ScraperResult & {
    result: UnknownRecord & {
        title?: string;
        type?: string;
        download?: string;
        thumbnail?: string;
    };
};
type ValidationError = UnknownRecord & {
    param: string;
    error: string;
};
type PinterestImage = {url?: string; width?: number; height?: number};
type PinterestVideo = {url?: string; width?: number; height?: number; file_size?: number};
type AmdlLinkResult = ScraperResult & {id?: string};
type AmdlFileInfo = UnknownRecord & {
    worker?: string;
    file?: string;
    title?: string;
    thumbnail?: string;
    duration?: number;
    uploader?: string;
};
type CaptchaChallenge = {
    algorithm: string;
    challenge: string;
    salt: string;
    maxnumber: number;
    signature: string;
};
type YtdownProgress = ScraperResult & {
    download_url?: string;
    progress?: number;
    text?: string;
};
type StdoutWithCursor = NodeJS.WriteStream & {
    clearLine?: () => void;
    cursorTo?: (x: number) => void;
};

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
const axiosStatus = (error: unknown): number => axios.isAxiosError(error) ? error.response?.status || 500 : 500;
const axiosData = (error: unknown): unknown => axios.isAxiosError(error) ? error.response?.data : undefined;
const asRecord = (value: unknown): UnknownRecord => value && typeof value === 'object' ? value as UnknownRecord : {};
//-------------------[YTDL AMDL]--------------------

const amdl = {
    api: {
        base: {
            video: 'https://amp4.cc',
            audio: 'https://amp3.cc'
        }
    },
    headers: {
        Accept: 'application/json',
        'User-Agent': 'Postify/1.0.0',
    },
    jar: new CookieJar(),
    client: wrapper(axios.create({jar: new CookieJar()} as unknown as Parameters<typeof axios.create>[0]) as unknown as Parameters<typeof wrapper>[0]),

    ytRegex: /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/,

    formats: {
        video: ['144p', '240p', '360p', '480p', '720p', '1080p'],
        audio: ['64k', '128k', '192k', '256k', '320k']
    },

    captcha: {
        hashChallenge: async function (salt: string, number: number, algorithm: string): Promise<string> {
            return createHash(algorithm.toLowerCase()).update(salt + number).digest('hex');
        },

        verifyChallenge: async function (challengeData: string, salt: string, algorithm: string, maxNumber: number): Promise<{
            number: number,
            took: number
        }> {
            for (let i = 0; i <= maxNumber; i++) {
                if (await this.hashChallenge(salt, i, algorithm) === challengeData) {
                    return {number: i, took: Date.now()};
                }
            }
            throw new Error('Fallo en la verificación de Captcha.');
        },

        solve: async function (challenge: CaptchaChallenge): Promise<string> {
            const {algorithm, challenge: challengeData, salt, maxnumber, signature} = challenge;
            const solution = await this.verifyChallenge(challengeData, salt, algorithm, maxnumber);
            return Buffer.from(
                JSON.stringify({
                    algorithm,
                    challenge: challengeData,
                    number: solution.number,
                    salt,
                    signature,
                    took: solution.took,
                })
            ).toString('base64');
        },
    },

    isUrl: async function (url: string): Promise<AmdlLinkResult> {
        if (!url) {
            return {
                status: false,
                code: 400,
                result: {
                    error: "[ ❌ ] ¿Dónde está el link? ¡No puedo descargar sin un link, por favor!"
                }
            };
        }

        if (!this.ytRegex.test(url)) {
            return {
                status: false,
                code: 400,
                result: {
                    error: "[ ❌ ] ¿Qué link metiste, hermano? ¡Solo links de YouTube, que eso es lo que quieres descargar!"
                }
            };
        }

        return {
            status: true,
            code: 200,
            id: url.match(this.ytRegex)![3]
        };
    },

    convert: async function (url: string, format: string, quality: string, isAudio: boolean = false): Promise<DownloadScraperResult> {
        try {
            const linkx = await this.isUrl(url);
            if (!linkx.status) return {...linkx, result: linkx.result || {}} as DownloadScraperResult;

            const formatx = isAudio ? this.formats.audio : this.formats.video;
            if (!quality || !formatx.includes(quality)) {
                return {
                    status: false,
                    code: 400,
                    result: {
                        error: "[ ❌ ] ¡Ese formato no existe, hermano! Elige uno de los disponibles, no busques lo que no hay.",
                        available_fmt: formatx
                    }
                };
            }

            const fixedURL = `https://youtu.be/${linkx.id}`;
            const base = isAudio ? this.api.base.audio : this.api.base.video;

            const pages = await this.client.get(`${base}/`);
            const $ = cheerio.load(pages.data);
            const csrfToken = $('meta[name="csrf-token"]').attr('content');

            if (!csrfToken) {
                return {
                    status: false,
                    code: 500,
                    result: {
                        error: "[ ❌ ] ¡No hay CSRF, hermano! Parece que hay un problema..."
                    }
                };
            }

            const form = new FormData();
            form.append('url', fixedURL);
            form.append('format', format);
            form.append('quality', quality);
            form.append('service', 'youtube');

            if (isAudio) {
                form.append('playlist', 'false');
            }

            form.append('_token', csrfToken);

            const captchaX = await this.client.get(`${base}/captcha`, {
                headers: {
                    ...this.headers,
                    Origin: base,
                    Referer: `${base}/`
                },
            });

            if (captchaX.data) {
                const solvedCaptcha = await this.captcha.solve(captchaX.data);
                form.append('altcha', solvedCaptcha);
            }

            const endpoint = isAudio ? '/convertAudio' : '/convertVideo';
            const res = await this.client.post(`${base}${endpoint}`, form, {
                headers: {
                    ...(typeof (form as unknown as {getHeaders?: () => UnknownRecord}).getHeaders === 'function' ? (form as unknown as {getHeaders: () => UnknownRecord}).getHeaders() : {}),
                    ...this.headers,
                    Origin: base,
                    Referer: `${base}/`
                },
            });

            if (!res.data.success) {
                return {
                    status: false,
                    code: 400,
                    result: {
                        error: res.data.message
                    }
                };
            }

            const ws = await this.connect(res.data.message, isAudio);
            const dlink = `${base}/dl/${ws.worker || ''}/${res.data.message}/${encodeURIComponent(ws.file || '')}`;

            return {
                status: true,
                code: 200,
                result: {
                    title: ws.title || "[ ❌ ] No sé",
                    type: isAudio ? 'audio' : 'video',
                    format: format,
                    thumbnail: ws.thumbnail || `https://i.ytimg.com/vi/${linkx.id}/maxresdefault.jpg`,
                    download: dlink,
                    id: linkx.id,
                    duration: ws.duration,
                    quality: quality,
                    uploader: ws.uploader
                }
            };

        } catch (error: unknown) {
            return {
                status: false,
                code: 500,
                result: {
                    error: "[ ❌ ] ¡Hubo un error, qué risa!"
                }
            };
        }
    },

    connect: async function (id: string, isAudio: boolean = false): Promise<AmdlFileInfo> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`wss://${isAudio ? 'amp3' : 'amp4'}.cc/ws`, ['json'], {
                headers: {
                    ...this.headers,
                    Origin: `https://${isAudio ? 'amp3' : 'amp4'}.cc`
                },
                rejectUnauthorized: false,
            });

            let fileInfo: AmdlFileInfo = {};
            let timeoutId = setTimeout(() => {
                ws.close();
                reject({
                    status: false,
                    code: 408,
                    result: {
                        error: "[ ❌ ] Se acabó el tiempo, el servidor no responde, ¡qué risa!"
                    }
                });
            }, 30000);

            ws.on('open', () => ws.send(id));
            ws.on('message', (data: WebSocket.RawData) => {
                const res = JSON.parse(data.toString()) as AmdlFileInfo & {event?: string; done?: boolean};
                if (res.event === 'query' || res.event === 'queue') {
                    fileInfo = {
                        thumbnail: res.thumbnail,
                        title: res.title,
                        duration: res.duration,
                        uploader: res.uploader
                    };
                } else if (res.event === 'file' && res.done) {
                    clearTimeout(timeoutId);
                    ws.close();
                    resolve({...fileInfo, ...res});
                }
            });
            ws.on('error', (_err: unknown) => {
                clearTimeout(timeoutId);
                reject({
                    status: false,
                    code: 500,
                    result: {
                        error: "[ ❌ ] ¡Qué mal, este servidor es pésimo! Falló la conexión otra vez, qué desastre."
                    }
                });
            });
        });
    },

    download: async function (url: string, format: string = '720p'): Promise<DownloadScraperResult> {
        try {
            const isAudio = format === 'mp3';
            return await this.convert(
                url,
                isAudio ? 'mp3' : 'mp4',
                isAudio ? '128k' : format,
                isAudio
            );
        } catch (error: unknown) {
            return {
                status: false,
                code: 500,
                result: {
                    error: "[ ❌ ] ¡Error, qué locura!"
                }
            };
        }
    }
};

const ytdown = {
    api: {
        base: "https://p.oceansaver.in/ajax/",
        progress: "https://p.oceansaver.in/ajax/progress.php"
    },
    headers: {
        'authority': 'p.oceansaver.in',
        'origin': 'https://y2down.cc',
        'referer': 'https://y2down.cc/',
        'user-agent': 'Postify/1.0.0'
    },
    formats: ['360', '480', '720', '1080', '1440', '2160', 'mp3', 'm4a', 'wav', 'aac', 'flac', 'opus', 'ogg'],

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

    request: async (endpoint: string, params: UnknownRecord = {}): Promise<UnknownRecord> => {
        try {
            const {data} = await axios.get(`${ytdown.api.base}${endpoint}`, {
                params, headers: ytdown.headers, withCredentials: true
            });
            return data;
        } catch (error: unknown) {
            logError(errorMessage(error), axiosData(error));
            throw error;
        }
    },

    download: async (link: string, format: string): Promise<ScraperResult> => {
        if (!link) return {error: "[ ❌ ] ¿Dónde está el link? ¡No puedo descargar sin un link, por favor!"};
        if (!ytdown.isUrl(link)) return {error: "[ ❌ ] ¿Qué link metiste, hermano? ¡Solo links de YouTube, que eso es lo que quieres descargar!"};
        if (!format || !ytdown.formats.includes(format)) return {
            error: "[ ❌ ] ¡Ese formato no existe, hermano! Elige uno de los disponibles, no busques lo que no hay.",
            availableFormats: ytdown.formats
        };

        const id = ytdown.youtube(link);
        if (!id) return {error: "[ ❌ ] No pude extraer el link de YouTube, usa un link correcto para que no pase esto otra vez, ¡qué risa!"};

        try {
            const response = await ytdown.request("download.php", {
                format,
                url: `https://www.youtube.com/watch?v=${id}`
            });
            return ytdown.handler(response, format, id);
        } catch (error: unknown) {
            return {
                error: `[ ❌ ] ${errorMessage(error)}`,
                details: axiosData(error)
            };
        }
    },

    handler: async (data: UnknownRecord, format: string, id: string): Promise<ScraperResult> => {
        if (!data.success) return {error: String(data.message || "[ ❌ ] Error")};
        if (!data.id) return {error: "[ ❌ ] ¡No hay ID de descarga, hermano! Así no puedo continuar el proceso, ¡qué risa!"};

        try {
            const pr = await ytdown.checkProgress(String(data.id));
            return pr.success ? ytdown.final(data, pr, format, id) : pr;
        } catch (error: unknown) {
            return {error: `[ ❌ ] ${errorMessage(error)}`};
        }
    },

    checkProgress: async (id: string): Promise<YtdownProgress> => {
        let attempts = 0, lastProgress = -1;
        process.stdout.write("[ ✨ ] Progreso: [                              ] 0%");

        while (attempts < 100) {
            try {
                const {data} = await axios.get(ytdown.api.progress, {
                    params: {id}, headers: ytdown.headers, withCredentials: true
                });

                const currentProgress = Math.round(data.progress / 10);
                if (currentProgress !== lastProgress) {
                    ytdown.updateBar(currentProgress);
                    lastProgress = currentProgress;
                }

                if (data.download_url && data.success) {
                    return {success: true, ...data};
                } else if (!data.download_url && data.success) {
                    return {error: data.text};
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            } catch (error: unknown) {
                logError("\n", error);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {error: "[ ❌ ] El proceso de descarga no pudo continuar, hermano, ¡se acabó el tiempo!"};
    },

    updateBar: (progress: number): void => {
        const barLength = 30;
        const filledLength = Math.round(barLength * progress / 100);
        const bar = '█'.repeat(filledLength) + ' '.repeat(barLength - filledLength);
        (process.stdout as unknown as StdoutWithCursor).clearLine?.();
        (process.stdout as unknown as StdoutWithCursor).cursorTo?.(0);
        process.stdout.write(`[ ✨ ] Progreso: [${bar}] ${progress}%\n\n`);
    },

    final: (init: UnknownRecord, pro: YtdownProgress, formats: string, id: string): ScraperResult => ({
        success: true,
        title: init.title || "[ ❌ ] No sé",
        type: ['360', '480', '720', '1080', '1440', '2160'].includes(formats) ? 'video' : 'audio',
        formats,
        thumbnail: asRecord(init.info).image || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        download: pro.download_url || "[ ❌ ] No sé",
        id: id
    })
};

export {amdl, ytdown};
