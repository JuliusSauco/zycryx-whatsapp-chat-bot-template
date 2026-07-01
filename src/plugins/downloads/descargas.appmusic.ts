import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import type {proto} from '@whiskeysockets/baileys';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadAppleMusicTrack} from '../../providers/downloads/applemusic.provider.js';
import {renderDownloadFailure} from './download-error.js';

const userMessages = createExpiringMap<proto.WebMessageInfo>({ttlMs: 10 * 60 * 1000});
const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['applemusic'],
    tags: ['downloader'],
    command: /^(applemusic)$/i,
    register: true,
    limit: 1,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.appleMusic.missingUrl', {
        command: sdk.usedPrefix + sdk.command
    });
    if (!userRequests.acquire(sdk.sender)) {
        await sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.appleMusic.locked', {
            user: sdk.sender.split('@')[0]
        }), userMessages.get(sdk.sender) || m)
        return;
    }
    await sdk.reply.react("⌛");
    try {
        const result = await downloadAppleMusicTrack(sdk.text);
        if (!result.data) return sdk.reply.text(renderDownloadFailure('appleMusic', result.failures));
        const songData = result.data;
        const urlLine = songData.url
            ? sdk.content.renderMessage('downloads.appleMusic.urlLine', {url: songData.url})
            : '';
        const texto = sdk.content.renderMessage('downloads.appleMusic.trackMessage', {
            title: songData.name,
            artists: songData.artists,
            duration: songData.duration,
            urlLine
        });
        const coverMessage = await sdk.sendFile(songData.image, 'cover.jpg', texto);
        userMessages.set(sdk.sender, coverMessage);
        await sdk.sendMessage({
            document: {url: songData.downloadUrl},
            fileName: `${songData.name}.mp3`,
            mimetype: 'audio/mp3'
        });
        await sdk.reply.react("✅");
    } catch (e: unknown) {
        logError("Error final:", e);
        await sdk.reply.message('downloads.appleMusic.error');
        await sdk.reply.react("❌");
    } finally {
        userRequests.release(sdk.sender);
    }
    }
});
