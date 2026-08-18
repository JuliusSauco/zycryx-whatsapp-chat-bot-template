import ytdl from 'ytdl-core';
import {httpRequest, httpText} from '../../lib/http-client.js';
import {resolveYoutubeSelection, type YoutubeSelectionScope} from '../../lib/youtube-selection-store.js';
import {searchYouTubeVideos} from '../youtube-search.provider.js';

export const AUDIO_QUALITIES = ['64', '96', '128', '192', '256', '320'];
export const VIDEO_QUALITIES = ['240', '360', '480', '720', '1080'];
export const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;

export async function searchYouTube(query: string) {
    return (await searchYouTubeVideos(query)).videos;
}

export function resolveIndexedYoutubeLink(input: string, scope: YoutubeSelectionScope): string {
    return input.includes('you') ? input : resolveYoutubeSelection(scope, Number.parseInt(input, 10));
}

export function bytesToSize(bytes: string | number | undefined): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const numericBytes = Number(bytes || 0);
    if (!numericBytes) return 'n/a';
    const i = Math.floor(Math.log(numericBytes) / Math.log(1024));
    return i === 0 ? `${numericBytes} ${sizes[i]}` : `${(numericBytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
}

export async function ytMp4(url: string): Promise<{title: string; result: string; rersult2: string; thumb: string}> {
    const video = await ytdl.getInfo(url);
    const format = video.formats.find(item => item.container === 'mp4' && item.hasVideo && item.hasAudio);
    if (!format) throw new Error('No se encontró formato mp4 válido');
    const tinyUrl = await httpText(`https://tinyurl.com/api-create.php?url=${format.url}`);
    const thumb = video.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url;
    return {title: video.videoDetails.title, result: tinyUrl, rersult2: format.url, thumb};
}

export function secondString(value: number | undefined): string {
    const seconds = Number(value);
    const d = Math.floor(seconds / 86400), h = Math.floor(seconds % 86400 / 3600);
    const m = Math.floor(seconds % 3600 / 60), s = Math.floor(seconds % 60);
    return `${d ? `${d} día${d === 1 ? '' : 's'}, ` : ''}${h ? `${h} hora${h === 1 ? '' : 's'}, ` : ''}${m ? `${m} minuto${m === 1 ? '' : 's'}, ` : ''}${s ? `${s} segundo${s === 1 ? '' : 's'}` : ''}`;
}

export async function getFileSize(url: string): Promise<number> {
    try {
        return Number.parseInt((await httpRequest(url, {method: 'HEAD'})).headers.get('content-length') || '0', 10);
    } catch { return 0; }
}
