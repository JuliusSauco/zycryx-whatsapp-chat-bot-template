import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {httpJson} from '../../lib/http-client.js';
import {runFirstProvider, type Provider} from '../../lib/provider-fallback.js';
import {replyReportableError} from '../../lib/reply-helpers.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';

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
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['spotify'],
    tags: ['downloader'],
    command: /^(spotify|music)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(`*🤔 ¿Que esta buscando? ingresa el nombre para descargar sus música de Spotify, Ejemplo:* ${usedPrefix + command} ozuna`)
    if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, `⚠️ Hey @${m.sender.split('@')[0]} pendejo, ya estás descargando una canción 🙄\nEspera a que termine tu descarga actual antes de pedir otra. 👆`, userMessages.get(m.sender) || m)
    m.react(`⌛`);
    try {
        const song = await httpJson<SpotifySearchResponse>(`${info.apis}/search/spotify?q=${text}`);
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

        const downloadProviders: Array<Provider<string>> = [
            {
                name: 'siputz-spotify',
                run: async () => {
                    const data = await httpJson<SpotifyDownloadResponse>(`https://api.siputzx.my.id/api/d/spotify?url=${track.url}`);
                    return data.data?.download;
                },
            },
            {
                name: 'main-spotify',
                run: async () => {
                    const data = await httpJson<SpotifyDownloadResponse>(`${info.apis}/download/spotifydl?url=${track.url}`);
                    return data.data?.url;
                },
            },
        ];

        const downloadUrl = await runFirstProvider(downloadProviders, 'No se pudo descargar la canción desde ninguna API');
        await conn.sendMessage(m.chat, {
            audio: {url: downloadUrl},
            fileName: `${track.title}.mp3`,
            mimetype: 'audio/mpeg',
            contextInfo: {}
        }, {quoted: m});
        m.react('✅️');
    } catch (error: unknown) {
        await replyReportableError(m, error);
        logInfo(error);
        m.react('❌');
    } finally {
        userRequests.release(m.sender);
    }
    }
});
