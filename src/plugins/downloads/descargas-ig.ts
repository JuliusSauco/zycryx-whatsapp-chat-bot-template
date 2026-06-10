import {definePlugin} from '../../core/define-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadInstagramMedia, type InstagramProviderMedia} from '../../providers/downloads/instagram.provider.js';

const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['instagram *<link ig>*'],
    tags: ['downloader'],
    command: /^(instagramdl|instagram|igdl|ig|instagramdl2|instagram2|igdl2|ig2|instagramdl3|instagram3|igdl3|ig3)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, args, command, usedPrefix}) {
        if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.instagram.missingUrl'), {
            command: usedPrefix + command,
        }));
        if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.instagram.locked'), {
            user: m.sender.split('@')[0],
        }), m);

        await m.react('⌛');
        try {
            const media = await downloadInstagramMedia(args[0]);
            if (!media.data) throw new Error('No se pudo descargar el archivo desde ninguna API');

            await conn.sendFile(m.chat, media.data.url, media.data.fileName, getInstagramCaption(media.data), m);
            await m.react('✅');
        } catch (e: unknown) {
            await m.react('❌');
            logInfo(e);
        } finally {
            userRequests.release(m.sender);
        }
    },
});

function getInstagramCaption(media: InstagramProviderMedia): string {
    if (media.caption) return media.caption;
    return media.type === 'image'
        ? getRequiredPluginMessage('downloads.instagram.imageCaption')
        : getRequiredPluginMessage('downloads.instagram.videoCaption');
}
