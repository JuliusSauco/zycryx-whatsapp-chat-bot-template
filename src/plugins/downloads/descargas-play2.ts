import {logError} from '../../lib/logger.js';
import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js'
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {renderDownloadFailure} from './download-error.js';
import {
    downloadYouTubeAudio,
    downloadYouTubeVideo,
    resolveIndexedYoutubeLink,
    searchYouTube,
    selectQuality,
} from '../../providers/downloads/youtube.provider.js';

const userRequests = createUserRequestLocks();
export default defineSdkPlugin({
    help: ['ytmp4', 'ytmp3'],
    tags: ['downloader'],
    command: /^(ytmp3|ytmp4|fgmp4|fgmp3|dlmp3|ytmp4doc|ytmp3doc)$/i,
    async execute(m, {sdk}) {
    if (!sdk.args[0]) return sdk.reply.message('downloads.play2.missingUrl')
    const sendType = sdk.command.includes('doc') ? 'document' : sdk.command.includes('mp3') ? 'audio' : 'video';
    const yt_play = await searchYouTube(sdk.args.join(' '));
    const youtubeLink = resolveIndexedYoutubeLink(sdk.args[0], sdk.sender);

    if (!userRequests.acquire(sdk.sender)) {
        return sdk.reply.message('downloads.play2.locked')
    }
    try {

        if (sdk.command == 'ytmp3' || sdk.command == 'fgmp3' || sdk.command == 'ytmp3doc') {
            await sdk.reply.react('⌛')
            const result = await downloadYouTubeAudio(sdk.args[0], {
                format: sdk.args[1] || 'mp3',
                fallbackUrl: youtubeLink,
            });
            const media = result.data;
            if (!media) return sdk.reply.text(renderDownloadFailure('play2', result.failures))
            await sdk.sendMessage({
                [sendType]: {url: media.url},
                mimetype: media.mimetype,
                fileName: media.fileName,
                contextInfo: {}
            });
        }

        if (sdk.command == 'ytmp4' || sdk.command == 'fgmp4' || sdk.command == 'ytmp4doc') {
            await sdk.reply.react('⌛')
            const [, quality = '720'] = sdk.text.split(' ');
            const selectedQuality = selectQuality(quality, false);
            const result = await downloadYouTubeVideo(sdk.args[0], {
                searchUrl: yt_play[0]?.url,
                fallbackUrl: youtubeLink,
                title: yt_play[0]?.title,
                quality: selectedQuality,
            });
            const media = result.data;
            if (!media) return sdk.reply.text(renderDownloadFailure('play2', result.failures))
            await sdk.sendMessage({
                [sendType]: {url: media.url},
                mimetype: media.mimetype,
                fileName: media.fileName,
                caption: media.fileName === 'error.mp4'
                    ? sdk.content.renderMessage('downloads.play2.watermarkCaption', {watermark: sdk.branding.watermark})
                    : renderVideoCaption(sdk.content, media.title || yt_play[0]?.title || 'video'),
                thumbnail: media.thumbnail
            })
        }

    } catch (error: unknown) {
        logError(error);
        await sdk.reply.react("❌️")
    } finally {
        userRequests.release(sdk.sender);
    }
    }
})

function renderVideoCaption(content: PluginContentSdk, title: string, variant: 'default' | 'compact' | 'quality' = 'default', quality?: string): string {
    if (variant === 'compact') {
        return content.renderMessage('downloads.play2.videoCaptionCompact', {title});
    }

    if (variant === 'quality') {
        return content.renderMessage('downloads.play2.videoCaptionQuality', {
            title,
            quality
        });
    }

    return content.renderMessage('downloads.play2.videoCaption', {title});
}
