import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadSpotifyTrack, searchSpotify} from '../../providers/downloads/spotify.provider.js';
import {renderDownloadFailure} from './download-error.js';

const userMessages = createExpiringMap<QuotedMessage>({ttlMs: 10 * 60 * 1000});
const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['spotify'],
    tags: ['downloader'],
    command: /^(spotify|music)$/i,
    register: true,
    limit: 1,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.spotify.missingQuery', {
        command: sdk.usedPrefix + sdk.command
    })
    if (!userRequests.acquire(sdk.sender)) return sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.spotify.locked', {
        user: sdk.sender.split('@')[0]
    }), userMessages.get(sdk.sender) || m)
    await sdk.reply.react(`⌛`);
    try {
        const song = await searchSpotify(sdk.text);
        if (song.length === 0) return sdk.reply.message('downloads.spotify.noResults')
        const track = song[0];
        const spotifyMessage = sdk.content.renderMessage('downloads.spotify.trackMessage', {
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            publish: track.publish
        });
        const message = await sdk.sendMessage({
            text: spotifyMessage,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                externalAdReply: {
                    showAdAttribution: true,
                    containsAutoReply: true,
                    renderLargerThumbnail: true,
                    title: track.title,
                    body: sdk.content.message('downloads.spotify.adBody'),
                    mediaType: 1,
                    thumbnailUrl: track.image,
                    mediaUrl: track.url,
                    sourceUrl: track.url
                }
            }
        });
        userMessages.set(sdk.sender, message);

        const media = await downloadSpotifyTrack(track);
        if (!media.data) return sdk.reply.text(renderDownloadFailure('spotify', media.failures));
        await sdk.sendMessage({
            audio: {url: media.data.url},
            fileName: media.data.fileName,
            mimetype: media.data.mimetype,
            contextInfo: {}
        });
        await sdk.reply.react('✅️');
    } catch (error: unknown) {
        await sdk.reply.reportableError(error);
        logInfo(error);
        await sdk.reply.react('❌');
    } finally {
        userRequests.release(sdk.sender);
    }
    }
});
