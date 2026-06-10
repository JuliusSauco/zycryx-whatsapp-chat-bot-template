import {definePlugin} from '../../core/define-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadFacebookMedia, isFacebookUrl, type FacebookProviderMedia} from '../../providers/downloads/facebook.provider.js';

const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['fb', 'facebook', 'fbdl'],
    tags: ['downloader'],
    command: /^(facebook|fb|facebookdl|fbdl|facebook2|fb2|facebookdl2|fbdl2|facebook3|fb3|facebookdl3|fbdl3|facebook4|fb4|facebookdl4|fbdl4|facebook5|fb5|facebookdl5|fbdl5)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, command, usedPrefix}) {
        const missingUrlMessage = renderTemplate(getRequiredPluginMessage('downloads.facebook.missingUrl'), {
            command: usedPrefix + command,
        });
        if (!args[0]) return m.reply(missingUrlMessage);
        if (!isFacebookUrl(args[0])) return m.reply(missingUrlMessage);
        if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.facebook.locked'), {
            user: m.sender.split('@')[0],
        }), m);

        await m.react('⌛');
        try {
            const media = await downloadFacebookMedia(args[0]);
            if (!media.data) throw new Error('No se pudo descargar el video o imagen desde ninguna API');

            await conn.sendFile(m.chat, media.data.url, media.data.fileName, getFacebookCaption(media.data), m);
            await m.react('✅');
        } catch (e: unknown) {
            await m.react('❌');
            logInfo(e);
        } finally {
            userRequests.release(m.sender);
        }
    },
});

function getFacebookCaption(media: FacebookProviderMedia): string {
    if (media.type === 'image') return getRequiredPluginMessage('downloads.facebook.imageCaption');
    return media.captionVariant === 'bold'
        ? getRequiredPluginMessage('downloads.facebook.videoCaptionBold')
        : getRequiredPluginMessage('downloads.facebook.videoCaption');
}
