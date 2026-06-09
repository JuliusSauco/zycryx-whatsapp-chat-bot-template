import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {
    downloadYouTubeAudio,
    downloadYouTubeVideo,
    resolveIndexedYoutubeLink,
    searchYouTube,
    selectQuality,
} from '../../providers/downloads/youtube.provider.js';

const userRequests = createUserRequestLocks();
export default definePlugin({
    help: ['ytmp4', 'ytmp3'],
    tags: ['downloader'],
    command: /^(ytmp3|ytmp4|fgmp4|fgmp3|dlmp3|ytmp4doc|ytmp3doc)$/i,
    async execute(m, {conn, text, args, command}) {
    if (!args[0]) return m.reply(getRequiredPluginMessage('downloads.play2.missingUrl'))
    const sendType = command.includes('doc') ? 'document' : command.includes('mp3') ? 'audio' : 'video';
    const yt_play = await searchYouTube(args.join(' '));
    const youtubeLink = resolveIndexedYoutubeLink(args[0], m.sender);

    if (!userRequests.acquire(m.sender)) {
        return m.reply(getRequiredPluginMessage('downloads.play2.locked'))
    }
    try {

        if (command == 'ytmp3' || command == 'fgmp3' || command == 'ytmp3doc') {
            await m.react('⌛')
            const media = await downloadYouTubeAudio(args[0], {
                format: args[1] || 'mp3',
                fallbackUrl: youtubeLink,
            });
            if (!media) return m.react("❌")
            await conn.sendMessage(m.chat, {
                [sendType]: {url: media.url},
                mimetype: media.mimetype,
                fileName: media.fileName,
                contextInfo: {}
            }, {quoted: m});
        }

        if (command == 'ytmp4' || command == 'fgmp4' || command == 'ytmp4doc') {
            await m.react('⌛')
            const [, quality = '720'] = text.split(' ');
            const selectedQuality = selectQuality(quality, false);
            const media = await downloadYouTubeVideo(args[0], {
                searchUrl: yt_play[0]?.url,
                fallbackUrl: youtubeLink,
                title: yt_play[0]?.title,
                quality: selectedQuality,
            });
            if (!media) return m.react("❌")
            await conn.sendMessage(m.chat, {
                [sendType]: {url: media.url},
                mimetype: media.mimetype,
                fileName: media.fileName,
                caption: media.fileName === 'error.mp4'
                    ? renderTemplate(getRequiredPluginMessage('downloads.play2.watermarkCaption'), {watermark: info.wm})
                    : renderVideoCaption(media.title || yt_play[0]?.title || 'video'),
                thumbnail: media.thumbnail
            }, {quoted: m})
        }

    } catch (error: unknown) {
        logError(error);
        m.react("❌️")
    } finally {
        userRequests.release(m.sender);
    }
    }
})

function renderVideoCaption(title: string, variant: 'default' | 'compact' | 'quality' = 'default', quality?: string): string {
    if (variant === 'compact') {
        return renderTemplate(getRequiredPluginMessage('downloads.play2.videoCaptionCompact'), {title});
    }

    if (variant === 'quality') {
        return renderTemplate(getRequiredPluginMessage('downloads.play2.videoCaptionQuality'), {
            title,
            quality
        });
    }

    return renderTemplate(getRequiredPluginMessage('downloads.play2.videoCaption'), {title});
}
