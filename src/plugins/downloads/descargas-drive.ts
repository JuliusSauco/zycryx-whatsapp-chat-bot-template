import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import {downloadDriveFile} from '../../providers/downloads/drive.provider.js';
import type {QuotedMessage} from '../../types/context.js';
import {renderDownloadFailure} from './download-error.js';

const userCaptions = createExpiringMap<QuotedMessage>({ttlMs: 10 * 60 * 1000});
const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['drive'].map(v => v + ' <url>'),
    tags: ['downloader'],
    command: /^(drive|drivedl|dldrive|gdrive)$/i,
    register: true,
    limit: 10,
    alternativeCoins: 100,
    async execute(m, {sdk}) {
        if (!sdk.args[0]) return sdk.reply.message('downloads.drive.missingUrl', {
            command: sdk.usedPrefix + sdk.command,
        });

        if (!userRequests.acquire(sdk.sender)) {
            await sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.drive.locked', {
                user: sdk.sender.split('@')[0],
            }), userCaptions.get(sdk.sender) || m);
            return;
        }

        await sdk.reply.react('📥');
        try {
            const waitMessageSent = await sdk.reply.message('downloads.drive.progress');
            userCaptions.set(sdk.sender, waitMessageSent);
            const fileResult = await downloadDriveFile(sdk.args[0]);
            if (!fileResult.data) return sdk.reply.text(renderDownloadFailure('drive', fileResult.failures));

            await sdk.sendMessage({
                document: {url: fileResult.data.url},
                mimetype: fileResult.data.mimetype,
                fileName: fileResult.data.filename,
                caption: undefined,
            });
            await sdk.reply.react('✅');
        } catch (e: unknown) {
            await sdk.reply.react('❌');
            await sdk.reply.reportableError(e);
            logInfo(e);
        } finally {
            userRequests.release(sdk.sender);
        }
    },
});
