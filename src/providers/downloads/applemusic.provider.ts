import * as cheerio from 'cheerio';
import {httpJson, httpText} from '../../lib/http-client.js';
import {DEFAULT_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export interface AppleMusicProviderTrack {
    name: string;
    artists: string;
    image: string;
    duration: string;
    downloadUrl: string;
    url?: string;
}

interface DeliriusAppleMusicResponse {
    data?: {
        name?: string;
        artists?: string;
        image?: string;
        duration?: string;
        download?: string;
    };
}

interface AppleSearchResponse {
    success?: boolean;
    name: string;
    albumname: string;
    artist: string;
    thumb: string;
    duration: string;
    url: string;
}

interface AppleDownloadedData {
    name: string;
    albumname: string;
    artist: string;
    url: string;
    thumb?: string;
    duration: string;
    token?: string;
    download: string;
}

export function buildAppleMusicDownloadProviders(trackUrl: string): ProviderCandidate<AppleMusicProviderTrack>[] {
    return withProviderPolicy([
        {
            name: 'main-applemusic',
            run: async () => {
                const apiUrl = `${info.apis}/applemusicdl?url=${encodeURIComponent(trackUrl)}`;
                const delius = await httpJson<DeliriusAppleMusicResponse>(apiUrl);
                if (!delius.data?.name || !delius.data.download || !delius.data.image) return null;
                return {
                    name: delius.data.name,
                    artists: delius.data.artists || '',
                    image: delius.data.image,
                    duration: delius.data.duration || '',
                    downloadUrl: delius.data.download,
                };
            },
        },
        {
            name: 'aaplmusicdownloader',
            run: async () => {
                const data = await downloadFromAaplMusicDownloader(trackUrl);
                if (!data.thumb) return null;
                return {
                    name: data.name,
                    artists: data.artist,
                    image: data.thumb,
                    duration: data.duration,
                    downloadUrl: data.download,
                    url: data.url,
                };
            },
        },
    ], {timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function downloadAppleMusicTrack(trackUrl: string): Promise<ProviderResult<AppleMusicProviderTrack>> {
    return runProviderCandidates(buildAppleMusicDownloadProviders(trackUrl));
}

async function getAppleMusicData(urls: string): Promise<AppleSearchResponse> {
    const url = `https://aaplmusicdownloader.com/api/applesearch.php?url=${urls}`;
    return httpJson<AppleSearchResponse>(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'MyApp/1.0',
        },
    });
}

async function getAppleMusicAudio(trackName: string, artist: string, urlMusic: string, token: string): Promise<string> {
    const url = 'https://aaplmusicdownloader.com/api/composer/swd.php';
    const data = {song_name: trackName, artist_name: artist, url: urlMusic, token};
    const response = await httpJson<{dlink?: string}>(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'MyApp/1.0',
        },
        body: new URLSearchParams(data),
    });
    if (!response.dlink) throw new Error('No se pudo obtener el audio');
    return response.dlink;
}

async function downloadFromAaplMusicDownloader(urls: string): Promise<AppleDownloadedData> {
    const musicData = await getAppleMusicData(urls);
    if (!musicData?.success) throw new Error('No se pudo obtener los datos en appledown API');
    const encodedData = encodeURIComponent(JSON.stringify([
        musicData.name,
        musicData.albumname,
        musicData.artist,
        musicData.thumb,
        musicData.duration,
        musicData.url,
    ]));
    const htmlData = await httpText('https://aaplmusicdownloader.com/song.php', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'User-Agent': 'MyApp/1.0',
        },
        body: new URLSearchParams({data: encodedData}),
    });
    const $ = cheerio.load(htmlData);
    const trackName = $('td:contains("Track Name:")').next().text();
    const albumName = $('td:contains("Album:")').next().text();
    const duration = $('td:contains("Duration:")').next().text();
    const artist = $('td:contains("Artist:")').next().text();
    const thumb = $('figure.image img').attr('src');
    const token = $('a#download_btn').attr('token');
    if (!token) throw new Error('No se encontro token de descarga');
    const downloadLink = await getAppleMusicAudio(trackName, artist, urls, token);
    return {
        name: trackName,
        albumname: albumName,
        artist,
        url: urls,
        thumb,
        duration,
        token,
        download: downloadLink,
    };
}
