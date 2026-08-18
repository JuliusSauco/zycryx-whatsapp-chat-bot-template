import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadFacebookMedia, isFacebookUrl, type FacebookProviderMedia} from '../../providers/downloads/facebook.provider.js';
import {renderDownloadFailure} from './download-error.js';

const userRequests = createUserRequestLocks('downloads:facebook');

export default defineSdkPlugin({
    help: ['fb', 'facebook', 'fbdl'],
    tags: ['downloader'],
    command: /^(facebook|fb|facebookdl|fbdl|facebook2|fb2|facebookdl2|fbdl2|facebook3|fb3|facebookdl3|fbdl3|facebook4|fb4|facebookdl4|fbdl4|facebook5|fb5|facebookdl5|fbdl5)$/i,
    register: true,
    limit: 10,
    alternativeCoins: 100,
    async execute(m, {sdk}) {
        const missingUrlMessage = sdk.content.renderMessage('downloads.facebook.missingUrl', {
            command: sdk.usedPrefix + sdk.command,
        });
        if (!sdk.args[0]) return sdk.reply.text(missingUrlMessage);
        if (!isFacebookUrl(sdk.args[0])) return sdk.reply.text(missingUrlMessage);
        if (!await userRequests.acquire(sdk.sender)) return sdk.reply.message('downloads.facebook.locked', {
            user: sdk.sender.split('@')[0],
        });

        await sdk.reply.react('⌛');
        try {
            const media = await downloadFacebookMedia(sdk.args[0]);
            if (!media.data) return sdk.reply.text(renderDownloadFailure('facebook', media.failures));

            await sdk.sendFile(media.data.url, media.data.fileName, getFacebookCaption(sdk.content, media.data));
            await sdk.reply.react('✅');
        } catch (e: unknown) {
            await sdk.reply.react('❌');
            logInfo(e);
        } finally {
            await userRequests.release(sdk.sender);
        }
    },
});

function getFacebookCaption(content: PluginContentSdk, media: FacebookProviderMedia): string {
    if (media.type === 'image') return content.message('downloads.facebook.imageCaption');
    return media.captionVariant === 'bold'
        ? content.message('downloads.facebook.videoCaptionBold')
        : content.message('downloads.facebook.videoCaption');
}
