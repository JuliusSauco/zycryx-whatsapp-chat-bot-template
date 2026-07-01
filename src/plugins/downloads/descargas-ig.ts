import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadInstagramMedia, type InstagramProviderMedia} from '../../providers/downloads/instagram.provider.js';
import {renderDownloadFailure} from './download-error.js';

const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['instagram *<link ig>*'],
    tags: ['downloader'],
    command: /^(instagramdl|instagram|igdl|ig|instagramdl2|instagram2|igdl2|ig2|instagramdl3|instagram3|igdl3|ig3)$/i,
    register: true,
    limit: 1,
    async execute(m, {sdk}) {
        if (!sdk.args[0]) return sdk.reply.message('downloads.instagram.missingUrl', {
            command: sdk.usedPrefix + sdk.command,
        });
        if (!userRequests.acquire(sdk.sender)) return sdk.reply.message('downloads.instagram.locked', {
            user: sdk.sender.split('@')[0],
        });

        await sdk.reply.react('⌛');
        try {
            const media = await downloadInstagramMedia(sdk.args[0]);
            if (!media.data) return sdk.reply.text(renderDownloadFailure('instagram', media.failures));

            await sdk.sendFile(media.data.url, media.data.fileName, getInstagramCaption(sdk.content, media.data));
            await sdk.reply.react('✅');
        } catch (e: unknown) {
            await sdk.reply.react('❌');
            logInfo(e);
        } finally {
            userRequests.release(sdk.sender);
        }
    },
});

function getInstagramCaption(content: PluginContentSdk, media: InstagramProviderMedia): string {
    if (media.caption) return media.caption;
    return media.type === 'image'
        ? content.message('downloads.instagram.imageCaption')
        : content.message('downloads.instagram.videoCaption');
}
