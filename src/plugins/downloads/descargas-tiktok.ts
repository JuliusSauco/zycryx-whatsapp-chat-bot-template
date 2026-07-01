import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadTikTokVideo, isTikTokUrl} from '../../providers/downloads/tiktok.provider.js';
import {renderDownloadFailure} from './download-error.js';

const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['tiktok'],
    tags: ['downloader'],
    command: /^(tt|tiktok)(dl|nowm)?$/i,
    limit: 1,
    async execute(m, {sdk}) {
        if (!sdk.text) return sdk.reply.message('downloads.tiktok.missingUrl', {
            command: sdk.usedPrefix + sdk.command,
        });
        if (!isTikTokUrl(sdk.text)) return sdk.reply.message('downloads.tiktok.invalidUrl');
        if (!userRequests.acquire(sdk.sender)) return sdk.reply.message('downloads.tiktok.locked', {
            user: sdk.sender.split('@')[0],
        });

        const {key} = await sdk.sendMessage({text: sdk.content.message('downloads.tiktok.downloading')});
        try {
            const media = await downloadTikTokVideo(sdk.args[0]);
            if (!media.data) {
                return sdk.conn.sendMessage(sdk.chatId, {text: renderDownloadFailure('tiktok', media.failures), edit: key});
            }

            await sdk.sendFile(media.data.url, media.data.fileName, sdk.content.message('downloads.tiktok.caption'));
            await sdk.conn.sendMessage(sdk.chatId, {text: sdk.content.message('downloads.tiktok.completed'), edit: key});
        } catch (e: unknown) {
            logInfo(e);
            await sdk.reply.react('❌');
        } finally {
            userRequests.release(sdk.sender);
        }
    },
});
