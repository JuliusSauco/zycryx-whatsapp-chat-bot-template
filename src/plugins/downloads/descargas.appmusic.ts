import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import * as cheerio from 'cheerio';
import type {proto} from '@whiskeysockets/baileys';
import {httpJson, httpText} from '../../lib/http-client.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';

interface SongData {
    name: string;
    artists: string;
    image: string;
    duration: string;
    download: string;
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

const userMessages = new Map<string, proto.WebMessageInfo>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['applemusic'],
    tags: ['downloader'],
    command: /^(applemusic)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(`Ejemplo de uso: ${usedPrefix + command} https://music.apple.com/us/album/glimpse-of-us/1625328890?i=1625328892`);
    if (!userRequests.acquire(m.sender)) {
        conn.reply(m.chat, `⚠️ Hey @${m.sender.split('@')[0]} pendejo, ya estás descargando una canción 🙄\nEspera a que termine tu descarga actual antes de pedir otra. 👆`, userMessages.get(m.sender) || m)
        return;
    }
    m.react("⌛");
    try {
        const downloadAttempts: Array<() => Promise<SongData>> = [async () => {
            const apiUrl = `${info.apis}/applemusicdl?url=${encodeURIComponent(text)}`;
            const delius = await httpJson<DeliriusAppleMusicResponse>(apiUrl);
            if (!delius.data?.name || !delius.data.download || !delius.data.image) throw new Error('Respuesta inválida de applemusicdl');
            return {
                name: delius.data.name,
                artists: delius.data.artists || '',
                image: delius.data.image,
                duration: delius.data.duration || '',
                download: delius.data.download
            };
        },
            async () => {
                const appledown = {
                    getData: async (urls: string): Promise<AppleSearchResponse> => {
                        const url = `https://aaplmusicdownloader.com/api/applesearch.php?url=${urls}`;
                        return httpJson<AppleSearchResponse>(url, {
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'MyApp/1.0'
                            }
                        });
                    },
                    getAudio: async (trackName: string, artist: string, urlMusic: string, token: string): Promise<string> => {
                        const url = 'https://aaplmusicdownloader.com/api/composer/swd.php';
                        const data = {song_name: trackName, artist_name: artist, url: urlMusic, token: token};
                        const headers = {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'User-Agent': 'MyApp/1.0'
                        };
                        const response = await httpJson<{dlink?: string}>(url, {
                            method: 'POST',
                            headers,
                            body: new URLSearchParams(data),
                        });
                        if (!response.dlink) throw new Error('No se pudo obtener el audio');
                        return response.dlink;
                    },
                    download: async (urls: string): Promise<AppleDownloadedData> => {
                        const musicData = await appledown.getData(urls);
                        if (!musicData || !musicData.success) throw new Error('No se pudo obtener los datos en appledown API');
                        const encodedData = encodeURIComponent(JSON.stringify([musicData.name, musicData.albumname, musicData.artist, musicData.thumb, musicData.duration, musicData.url]));
                        const url = 'https://aaplmusicdownloader.com/song.php';
                        const headers = {
                            'content-type': 'application/x-www-form-urlencoded',
                            'User-Agent': 'MyApp/1.0'
                        };
                        const htmlData = await httpText(url, {
                            method: 'POST',
                            headers,
                            body: new URLSearchParams({data: encodedData}),
                        });
                        const $ = cheerio.load(htmlData);
                        const trackName = $('td:contains("Track Name:")').next().text();
                        const albumName = $('td:contains("Album:")').next().text();
                        const duration = $('td:contains("Duration:")').next().text();
                        const artist = $('td:contains("Artist:")').next().text();
                        const thumb = $('figure.image img').attr('src');
                        const urlMusic = urls;
                        const token = $('a#download_btn').attr('token');
                        if (!token) throw new Error('No se encontró token de descarga');
                        const downloadLink = await appledown.getAudio(trackName, artist, urlMusic, token);
                        return {
                            name: trackName,
                            albumname: albumName,
                            artist,
                            url: urlMusic,
                            thumb,
                            duration,
                            token,
                            download: downloadLink
                        };
                    }
                };
                const dataos = await appledown.download(text);
                if (!dataos.thumb) throw new Error('No se encontró portada');
                return {
                    name: dataos.name,
                    artists: dataos.artist,
                    image: dataos.thumb,
                    duration: dataos.duration,
                    download: dataos.download,
                    url: dataos.url,
                }
            },
        ];

        let songData: SongData | null = null;
        for (const attempt of downloadAttempts) {
            try {
                songData = await attempt();
                if (songData) break;
            } catch (err: unknown) {
                logError(`Error in attempt: ${err instanceof Error ? err.message : String(err)}`);
                continue;
            }
        }

        if (!songData) throw new Error('No se pudo descargar la canción desde ninguna API');
        const texto = `*• Titulo:* ${songData.name}\n*• Artistas:* ${songData.artists}\n*• Duración:* ${songData.duration}${songData.url ? `\n*• URL:* ${songData.url}` : ''}`;
        const coverMessage = await conn.sendFile(m.chat, songData.image, 'cover.jpg', texto, m);
        userMessages.set(m.sender, coverMessage);
        await conn.sendMessage(m.chat, {
            document: {url: songData.download},
            fileName: `${songData.name}.mp3`,
            mimetype: 'audio/mp3'
        }, {quoted: m});
        m.react("✅");
    } catch (e: unknown) {
        logError("Error final:", e);
        m.reply("Ocurrió un error al intentar obtener el enlace de descarga.");
        m.react("❌");
    } finally {
        userRequests.release(m.sender);
    }
    }
});
