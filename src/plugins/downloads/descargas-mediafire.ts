import {botInfo} from "../../core/config.js";
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {logError} from '../../lib/logger.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadMediafireFile} from '../../providers/downloads/mediafire.provider.js';
import type {QuotedMessage} from '../../types/context.js';
import {renderDownloadFailure} from './download-error.js';

const userCaptions = createExpiringMap<QuotedMessage>({ttlMs: 10 * 60 * 1000});
const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['mediafire', 'mediafiredl'],
    tags: ['downloader'],
    command: /^(mediafire|mediafiredl|dlmediafire)$/i,
    register: true,
    limit: 10,
    alternativeCoins: 100,
    async execute(m, {sdk}) {
        const sticker = 'https://qu.ax/Wdsb.webp';
        if (!sdk.args[0]) return sdk.reply.message('downloads.mediafire.missingUrl', {
            command: sdk.usedPrefix + sdk.command,
        });

        if (!userRequests.acquire(sdk.sender)) return sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.mediafire.locked', {
            user: sdk.sender.split('@')[0],
        }), userCaptions.get(sdk.sender) || m);

        await sdk.reply.react('🚀');
        try {
            const fileResult = await downloadMediafireFile(sdk.args[0]);
            if (!fileResult.data) return sdk.reply.text(renderDownloadFailure('mediafire', fileResult.failures));

            const file = fileResult.data;
            const caption = sdk.content.renderMessage('downloads.mediafire.caption', {
                filename: file.filename,
                filesize: file.filesize,
                mimetype: file.mimetype,
                version: botInfo.vs,
            }).trim();
            const captionMessage = await sdk.reply.text(caption);
            userCaptions.set(sdk.sender, captionMessage);
            await sdk.sendFile(file.url, file.filename, '', m, undefined, {mimetype: file.mimetype, asDocument: true});
            await sdk.reply.react('✅');
        } catch (e: unknown) {
            await sdk.sendFile(sticker, 'error.webp', '');
            await sdk.reply.react('❌');
            logError(e);
        } finally {
            userRequests.release(sdk.sender);
        }
    },
});
