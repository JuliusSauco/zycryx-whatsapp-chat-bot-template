import {definePlugin} from '../core/define-plugin.js'
import axios from 'axios';
import fetch from 'node-fetch';
import {ENV} from '../core/env.js';

const userMessages = new Map();
const userRequests: Record<string, any> = {};

export default definePlugin({
    help: ['spotify'],
    tags: ['downloader'],
    command: /^(spotify|music)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(`*🤔 ¿Que esta buscando? ingresa el nombre para descargar sus música de Spotify, Ejemplo:* ${usedPrefix + command} ozuna`)
    if (userRequests[m.sender]) return await conn.reply(m.chat, `⚠️ Hey @${m.sender.split('@')[0]} pendejo, ya estás descargando una canción 🙄\nEspera a que termine tu descarga actual antes de pedir otra. 👆`, userMessages.get(m.sender) || m)
    userRequests[m.sender] = true;
    m.react(`⌛`);
    try {
        const spotify = await fetch(`${info.apis}/search/spotify?q=${text}`);
        const song = await spotify.json();
        // @ts-ignore
        if (!song.data || song.data.length === 0) return m
        // @ts-ignore
        reply('⚠️ No se encontraron resultados para esa búsqueda.')
        // @ts-ignore
        const track = song.data[0];
        const spotifyMessage = `*• Título:* ${track.title}\n*• Artista:* ${track.artist}\n*• Álbum:* ${track.album}\n*• Duración:* ${track.duration}\n*• Publicado:* ${track.publish}\n\n> 🚀 *ᴱⁿᵛᶦᵃⁿᵈᵒ ᶜᵃⁿᶜᶦᵒ́ⁿ ᵃᵍᵘᵃʳᵈᵉ ᵘⁿ ᵐᵒᵐᵉⁿᵗᵒ....*`;
        const message = await conn.sendMessage(m.chat, {
            text: spotifyMessage,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                externalAdReply: {
                    showAdAttribution: true,
                    containsAutoReply: true,
                    renderLargerThumbnail: true,
                    title: track.title,
                    body: "ᴱⁿᵛᶦᵃⁿᵈᵒ ᶜᵃⁿᶜᶦᵒ́ⁿ ᵃᵍᵘᵃʳᵈᵉ ᵘⁿ ᵐᵒᵐᵉⁿᵗᵒ 🚀",
                    mediaType: 1,
                    thumbnailUrl: track.image,
                    mediaUrl: track.url,
                    sourceUrl: track.url
                }
            }
        }, {quoted: m});
        userMessages.set(m.sender, message);

        const downloadAttempts = [async () => {
            const res = await fetch(`https://api.siputzx.my.id/api/d/spotify?url=${track.url}`);
            const data = await res.json() as any;
            return data.data.download;
        },
            async () => {
                const res = await fetch(`${info.apis}/download/spotifydl?url=${track.url}`);
                const data = await res.json() as any;
                return data.data.url;
            }];

        let downloadUrl = null;
        for (const attempt of downloadAttempts) {
            try {
                downloadUrl = await attempt();
                if (downloadUrl) break;
            } catch (err: any) {
                console.error(`Error in attempt: ${err.message}`);
                continue;
            }
        }

        if (!downloadUrl) throw new Error('No se pudo descargar la canción desde ninguna API');
        await conn.sendMessage(m.chat, {
            audio: {url: downloadUrl},
            fileName: `${track.title}.mp3`,
            mimetype: 'audio/mpeg',
            contextInfo: {}
        }, {quoted: m});
        m.react('✅️');
    } catch (error: any) {
        m.reply(`\`\`\`⚠️ OCURRIO UN ERROR ⚠️\`\`\`\n\n> *Reporta el siguiente error a mi creador con el comando:* #report\n\n>>> ${error} <<<< `);
        console.log(error);
        m.react('❌');
    } finally {
        delete userRequests[m.sender];
    }
    }
});

;

async function spotifyxv(query: any) {
    let token = await tokens();
    try {
        let response = await axios({
            method: 'get',
            url: 'https://api.spotify.com/v1/search?q=' + query + '&type=track',
            headers: {
                Authorization: 'Bearer ' + token,
            },
        });
        const tracks = response.data.tracks.items;
        const results = tracks.map((track: any) => ({
            name: track.name,
            artista: track.artists.map((artist: any) => artist.name),
            album: track.album.name,
            duracion: timestamp(track.duration_ms),
            url: track.external_urls.spotify,
            imagen: track.album.images.length ? track.album.images[0].url : '',
        }));
        return results;
    } catch (error: any) {
        console.error(`Error en spotifyxv: ${error}`);
        return [];
    }
}

async function tokens() {
    if (!ENV.SPOTIFY_CLIENT_ID || !ENV.SPOTIFY_CLIENT_SECRET) {
        throw new Error('SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET no están configurados');
    }
    try {
        const credentials = `${ENV.SPOTIFY_CLIENT_ID}:${ENV.SPOTIFY_CLIENT_SECRET}`;
        const response = await axios({
            method: 'post',
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(credentials).toString('base64'),
            },
            data: 'grant_type=client_credentials',
        });
        return response.data.access_token;
    } catch (error: any) {
        console.error(`Error en tokens: ${error}`);
        throw new Error('No se pudo obtener el token de acceso');
    }
}

function timestamp(time: any) {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

async function getBuffer(url: any, options: any) {
    try {
        options = options || {};
        const res = await axios({
            method: 'get',
            url,
            headers: {
                DNT: 1,
                'Upgrade-Insecure-Request': 1,
            },
            ...options,
            responseType: 'arraybuffer',
        });
        return res.data;
    } catch (err: any) {
        return err;
    }
}

async function getTinyURL(text: any) {
    try {
        let response = await axios.get(`https://tinyurl.com/api-create.php?url=${text}`);
        return response.data;
    } catch (error: any) {
        return text;
    }
}
