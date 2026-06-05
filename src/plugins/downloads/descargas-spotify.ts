import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import fetch from 'node-fetch';
import type {QuotedMessage} from '../../types/context.js';

interface SpotifyTrack {
    title: string
    artist?: string
    album?: string
    duration?: string
    publish?: string
    image?: string
    url: string
}

interface SpotifySearchResponse {
    data?: SpotifyTrack[]
}

interface SpotifyDownloadResponse {
    data?: {
        download?: string
        url?: string
    }
}

const userMessages = new Map<string, QuotedMessage>();
const userRequests: Record<string, boolean> = {};

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
        const song = await spotify.json() as SpotifySearchResponse;
        if (!song.data || song.data.length === 0) return m.reply('⚠️ No se encontraron resultados para esa búsqueda.')
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

        const downloadAttempts: Array<() => Promise<string | undefined>> = [async () => {
            const res = await fetch(`https://api.siputzx.my.id/api/d/spotify?url=${track.url}`);
            const data = await res.json() as SpotifyDownloadResponse;
            return data.data?.download;
        },
            async () => {
                const res = await fetch(`${info.apis}/download/spotifydl?url=${track.url}`);
                const data = await res.json() as SpotifyDownloadResponse;
                return data.data?.url;
            }];

        let downloadUrl = null;
        for (const attempt of downloadAttempts) {
            try {
                downloadUrl = await attempt();
                if (downloadUrl) break;
            } catch (err: unknown) {
                logError(`Error in attempt: ${err instanceof Error ? err.message : String(err)}`);
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
    } catch (error: unknown) {
        m.reply(`\`\`\`⚠️ OCURRIO UN ERROR ⚠️\`\`\`\n\n> *Reporta el siguiente error a mi creador con el comando:* #report\n\n>>> ${error} <<<< `);
        logInfo(error);
        m.react('❌');
    } finally {
        delete userRequests[m.sender];
    }
    }
});
