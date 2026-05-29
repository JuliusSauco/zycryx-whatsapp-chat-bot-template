import {definePlugin} from '../core/define-plugin.js'
import axios from 'axios';
import * as cheerio from 'cheerio';
// @ts-ignore
import qs from 'qs';

const userMessages = new Map();
const userRequests: Record<string, any> = {};

export default definePlugin({
    help: ['applemusic'],
    tags: ['downloader'],
    command: /^(applemusic)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(`Ejemplo de uso: ${usedPrefix + command} https://music.apple.com/us/album/glimpse-of-us/1625328890?i=1625328892`);
    if (userRequests[m.sender]) {
        conn.reply(m.chat, `⚠️ Hey @${m.sender.split('@')[0]} pendejo, ya estás descargando una canción 🙄\nEspera a que termine tu descarga actual antes de pedir otra. 👆`, userMessages.get(m.sender) || m)
        return;
    }
    userRequests[m.sender] = true;
    m.react("⌛");
    try {
        const downloadAttempts = [async () => {
            const apiUrl = `${info.apis}/applemusicdl?url=${encodeURIComponent(text)}`;
            const apiResponse = await fetch(apiUrl);
            const delius = await apiResponse.json() as any;
            return {
                name: delius.data.name,
                artists: delius.data.artists,
                image: delius.data.image,
                duration: delius.data.duration,
                download: delius.data.download
            };
        },
            async () => {
                const appledown = {
                    getData: async (urls: any) => {
                        const url = `https://aaplmusicdownloader.com/api/applesearch.php?url=${urls}`;
                        const response = await axios.get(url, {
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'MyApp/1.0'
                            }
                        });
                        return response.data;
                    },
                    getAudio: async (trackName: any, artist: any, urlMusic: any, token: any) => {
                        const url = 'https://aaplmusicdownloader.com/api/composer/swd.php';
                        const data = {song_name: trackName, artist_name: artist, url: urlMusic, token: token};
                        const headers = {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'User-Agent': 'MyApp/1.0'
                        };
                        const response = await axios.post(url, qs.stringify(data), {headers});
                        return response.data.dlink;
                    },
                    download: async (urls: any) => {
                        const musicData = await appledown.getData(urls);
                        if (!musicData || !musicData.success) throw new Error('No se pudo obtener los datos en appledown API');
                        const encodedData = encodeURIComponent(JSON.stringify([musicData.name, musicData.albumname, musicData.artist, musicData.thumb, musicData.duration, musicData.url]));
                        const url = 'https://aaplmusicdownloader.com/song.php';
                        const headers = {
                            'content-type': 'application/x-www-form-urlencoded',
                            'User-Agent': 'MyApp/1.0'
                        };
                        const data = `data=${encodedData}`;
                        const response = await axios.post(url, data, {headers});
                        const htmlData = response.data;
                        const $ = cheerio.load(htmlData);
                        const trackName = $('td:contains("Track Name:")').next().text();
                        const albumName = $('td:contains("Album:")').next().text();
                        const duration = $('td:contains("Duration:")').next().text();
                        const artist = $('td:contains("Artist:")').next().text();
                        const thumb = $('figure.image img').attr('src');
                        const urlMusic = urls;
                        const token = $('a#download_btn').attr('token');
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

        let songData = null;
        for (const attempt of downloadAttempts) {
            try {
                songData = await attempt();
                if (songData) break; // Si se obtiene un resultado, salir del bucle
            } catch (err: any) {
                console.error(`Error in attempt: ${err.message}`);
                continue; // Si falla, intentar con la siguiente API
            }
        }

        if (!songData) throw new Error('No se pudo descargar la canción desde ninguna API');
        // @ts-ignore
        const texto = `*• Titulo:* ${songData.name}\n*• Artistas:* ${songData.artists}\n*• Duración:* ${songData.duration}${songData.url ? `\n*• URL:* ${songData.url}` : ''}`;
        const coverMessage = await conn.sendFile(m.chat, songData.image, 'cover.jpg', texto, m);
        userMessages.set(m.sender, coverMessage);
        await conn.sendMessage(m.chat, {
            document: {url: songData.download},
            fileName: `${songData.name}.mp3`,
            mimetype: 'audio/mp3'
        }, {quoted: m});
        m.react("✅");
    } catch (e: any) {
        console.error("Error final:", e);
        m.reply("Ocurrió un error al intentar obtener el enlace de descarga.");
        m.react("❌");
    } finally {
        delete userRequests[m.sender];
    }
    }
});

;