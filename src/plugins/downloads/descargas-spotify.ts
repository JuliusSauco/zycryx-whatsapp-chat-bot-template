import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {replyReportableError} from '../../lib/reply-helpers.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadSpotifyTrack, searchSpotify} from '../../providers/downloads/spotify.provider.js';

const userMessages = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['spotify'],
    tags: ['downloader'],
    command: /^(spotify|music)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.spotify.missingQuery'), {
        command: usedPrefix + command
    }))
    if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.spotify.locked'), {
        user: m.sender.split('@')[0]
    }), userMessages.get(m.sender) || m)
    m.react(`⌛`);
    try {
        const song = await searchSpotify(text);
        if (song.length === 0) return m.reply(getRequiredPluginMessage('downloads.spotify.noResults'))
        const track = song[0];
        const spotifyMessage = renderTemplate(getRequiredPluginMessage('downloads.spotify.trackMessage'), {
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            publish: track.publish
        });
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
                    body: getRequiredPluginMessage('downloads.spotify.adBody'),
                    mediaType: 1,
                    thumbnailUrl: track.image,
                    mediaUrl: track.url,
                    sourceUrl: track.url
                }
            }
        }, {quoted: m});
        userMessages.set(m.sender, message);

        const media = await downloadSpotifyTrack(track);
        if (!media.data) throw new Error('No se pudo descargar la canción desde ninguna API');
        await conn.sendMessage(m.chat, {
            audio: {url: media.data.url},
            fileName: media.data.fileName,
            mimetype: media.data.mimetype,
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
