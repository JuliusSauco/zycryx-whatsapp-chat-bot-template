import yts from 'yt-search';
import ytdl from 'ytdl-core';
import {savetube} from '../../lib/yt-savetube.js';
import {ogmp3} from '../../lib/youtubedl.js';
import {ENV} from '../../core/env.js';
import {httpJson, httpRequest, httpText} from '../../lib/http-client.js';

export interface DownloadResult {
    result?: {
        download?: string | {url?: string}
        dl_url?: string
    }
    data?: {
        url?: string
        dl?: string
        download?: {
            url?: string
        }
    }
    dl?: string
    status?: boolean
    medias?: Array<{
        quality?: string
        extension?: string
        url?: string
    }>
}

export interface DownloadApi {
    url: () => Promise<DownloadResult>
    extract: (data: DownloadResult) => {data?: string | null; isDirect: boolean}
}

export type DownloadMedia = {
    mediaData: string | null;
    isDirect: boolean;
};

export const AUDIO_QUALITIES = ['64', '96', '128', '192', '256', '320'];
export const VIDEO_QUALITIES = ['240', '360', '480', '720', '1080'];

export const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;

export async function searchYouTube(query: string, options: Record<string, unknown> = {}) {
    const search = await yts.search({query, hl: 'es', gl: 'ES', ...options});
    return search.videos;
}

export function resolveIndexedYoutubeLink(input: string, sender: string): string {
    if (input.includes('you')) return input;

    const index = parseInt(input, 10) - 1;
    if (index < 0 || !Array.isArray(global.videoList) || !global.videoList.length) return '';

    const matchingItem = global.videoList.find(item => item.from === sender);
    return matchingItem?.urls[index] || '';
}

export function bytesToSize(bytes: string | number | undefined): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const numericBytes = Number(bytes || 0);
    if (!numericBytes) return 'n/a';

    const i = Math.floor(Math.log(numericBytes) / Math.log(1024));
    if (i === 0) return `${numericBytes} ${sizes[i]}`;
    return `${(numericBytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
}

export async function ytMp4(url: string): Promise<{title: string; result: string; rersult2: string; thumb: string}> {
    const getUrl = await ytdl.getInfo(url);
    const result = [];

    for (const item of getUrl.formats) {
        if (item.container === 'mp4' && item.hasVideo === true && item.hasAudio === true) {
            result.push({
                video: item.url,
                quality: item.qualityLabel,
                size: bytesToSize(item.contentLength),
            });
        }
    }

    const resultFix = result.filter(x => x.video && x.size && x.quality);
    if (!resultFix[0]) throw new Error('No se encontró formato mp4 válido');

    const tinyUrl = await httpText(`https://tinyurl.com/api-create.php?url=${resultFix[0].video}`);
    const title = getUrl.videoDetails.title;
    const thumb = getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url;
    return {title, result: tinyUrl, rersult2: resultFix[0].video, thumb};
}

export function secondString(seconds: number | undefined) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d == 1 ? ' día, ' : ' días, ') : '';
    const hDisplay = h > 0 ? h + (h == 1 ? ' hora, ' : ' horas, ') : '';
    const mDisplay = m > 0 ? m + (m == 1 ? ' minuto, ' : ' minutos, ') : '';
    const sDisplay = s > 0 ? s + (s == 1 ? ' segundo' : ' segundos') : '';
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

export async function getFileSize(url: string) {
    try {
        const response = await httpRequest(url, {method: 'HEAD'});
        return parseInt(response.headers.get('content-length') || '0');
    } catch {
        return 0;
    }
}

export async function runDownloadProviders(apis: DownloadApi[]): Promise<DownloadMedia> {
    for (const api of apis) {
        try {
            const data = await api.url();
            const {data: extractedData, isDirect} = api.extract(data);
            if (!extractedData) continue;

            const size = await getFileSize(extractedData);
            if (size >= 1024) return {mediaData: extractedData, isDirect};
        } catch {
            continue;
        }
    }

    return {mediaData: null, isDirect: false};
}

export function selectQuality(input: string, isAudioCommand: boolean): string {
    const qualities = isAudioCommand ? AUDIO_QUALITIES : VIDEO_QUALITIES;
    return qualities.includes(input) ? input : isAudioCommand ? '320' : '720';
}

export function buildAudioApis(videoUrl: string, title: string, format: string, selectedQuality: string): DownloadApi[] {
    return [
        {
            url: () => savetube.download(videoUrl, format),
            extract: data => ({data: downloadValue(data.result?.download), isDirect: false}),
        },
        {
            url: () => ogmp3.download(videoUrl, selectedQuality, 'audio'),
            extract: data => ({data: downloadValue(data.result?.download), isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`https://api.dorratz.com/v3/ytdl?url=${videoUrl}`),
            extract: data => {
                const mp3 = data.medias?.find(media => media.quality === '160kbps' && media.extension === 'mp3');
                return {data: mp3?.url, isDirect: false};
            },
        },
        {
            url: () => httpJson<DownloadResult>(`${info.neoxr.url}/youtube?url=${videoUrl}&type=audio&quality=128kbps&apikey=${info.neoxr.key}`),
            extract: data => ({data: data.data?.url, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`${info.fgmods.url}/downloader/ytmp4?url=${videoUrl}&apikey=${info.fgmods.key}`),
            extract: data => ({data: data.result?.dl_url, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`https://api.siputzx.my.id/api/d/ytmp4?url=${videoUrl}`),
            extract: data => ({data: data.dl, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`${info.apis}/download/ytmp3?url=${videoUrl}`),
            extract: data => ({data: data.status ? data.data?.download?.url : null, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`https://api.zenkey.my.id/api/download/ytmp3?apikey=${ENV.ZENKEY_API_KEY}&url=${videoUrl}`),
            extract: data => ({data: downloadValue(data.result?.download), isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`https://exonity.tech/api/dl/playmp3?query=${title}`),
            extract: data => ({data: downloadValue(data.result?.download), isDirect: false}),
        },
    ];
}

export function buildVideoApis(videoUrl: string, title: string, selectedQuality: string): DownloadApi[] {
    return [
        {
            url: () => savetube.download(videoUrl, '720'),
            extract: data => ({data: downloadValue(data.result?.download), isDirect: false}),
        },
        {
            url: () => ogmp3.download(videoUrl, selectedQuality, 'video'),
            extract: data => ({data: downloadValue(data.result?.download), isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`https://api.siputzx.my.id/api/d/ytmp4?url=${videoUrl}`),
            extract: data => ({data: data.dl, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`${info.neoxr.url}/youtube?url=${videoUrl}&type=video&quality=720p&apikey=${info.neoxr.key}`),
            extract: data => ({data: data.data?.url, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`${info.fgmods.url}/downloader/ytmp4?url=${videoUrl}&apikey=${info.fgmods.key}`),
            extract: data => ({data: data.result?.dl_url, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`${info.apis}/download/ytmp4?url=${encodeURIComponent(videoUrl)}`),
            extract: data => ({data: data.status ? data.data?.download?.url : null, isDirect: false}),
        },
        {
            url: () => httpJson<DownloadResult>(`https://exonity.tech/api/dl/playmp4?query=${encodeURIComponent(title)}`),
            extract: data => ({data: downloadValue(data.result?.download), isDirect: false}),
        },
    ];
}

function downloadValue(value: string | {url?: string} | undefined) {
    return typeof value === 'string' ? value : value?.url;
}
