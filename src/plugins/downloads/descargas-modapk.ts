import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadModApk} from '../../providers/downloads/modapk.provider.js';
import {renderDownloadFailure} from './download-error.js';

const userMessages = createExpiringMap<QuotedMessage>({ttlMs: 10 * 60 * 1000});
const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['apk', 'apkmod'],
    tags: ['downloader'],
    command: /^(apkmod|apk|modapk|dapk2|aptoide|aptoidedl)$/i,
    register: true,
    limit: 2,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.modApk.missingQuery')
    if (!userRequests.acquire(sdk.sender)) return sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.modApk.locked', {
        user: sdk.sender.split('@')[0]
    }), userMessages.get(sdk.sender) || m)
    await sdk.reply.react("⌛");
    try {
        const apkResult = await downloadModApk(sdk.text);
        if (!apkResult.data) return sdk.reply.text(renderDownloadFailure('modApk', apkResult.failures));
        const apkData = apkResult.data;
        const developerOrPackage = apkData.developer
            ? sdk.content.renderMessage('downloads.modApk.developerLine', {developer: apkData.developer})
            : sdk.content.renderMessage('downloads.modApk.packageLine', {package: apkData.package});
        const response = sdk.content.renderMessage('downloads.modApk.response', {
            name: apkData.name,
            developerOrPackage,
            updatedAt: apkData.developer ? apkData.publish : apkData.lastUpdate,
            size: apkData.size
        });
        const responseMessage = await sdk.sendFile(apkData.icon, 'apk.jpg', response);
        userMessages.set(sdk.sender, responseMessage);

        const apkSize = apkData.size.toLowerCase();
        if (apkSize.includes('gb') || (apkSize.includes('mb') && parseFloat(apkSize) > 999)) {
            await sdk.reply.message('downloads.modApk.tooLarge');
            return;
        }

        await sdk.sendMessage({
            document: {url: apkData.downloadUrl},
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${apkData.name}.apk`,
            caption: undefined
        });
        await sdk.reply.react("✅");
    } catch (e: unknown) {
        await sdk.reply.react('❌');
        logInfo(e);
    } finally {
        userRequests.release(sdk.sender);
    }
    }
});
