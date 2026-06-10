import {definePlugin} from '../../core/define-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadTikTokVideo, isTikTokUrl} from '../../providers/downloads/tiktok.provider.js';

const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['tiktok'],
    tags: ['downloader'],
    command: /^(tt|tiktok)(dl|nowm)?$/i,
    limit: 1,
    async execute(m, {conn, text, args, usedPrefix, command}) {
        if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.tiktok.missingUrl'), {
            command: usedPrefix + command,
        }));
        if (!isTikTokUrl(text)) return m.reply(getRequiredPluginMessage('downloads.tiktok.invalidUrl'));
        if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.tiktok.locked'), {
            user: m.sender.split('@')[0],
        }), m);

        const {key} = await conn.sendMessage(m.chat, {text: getRequiredPluginMessage('downloads.tiktok.downloading')}, {quoted: m});
        try {
            const media = await downloadTikTokVideo(args[0]);
            if (!media.data) throw new Error('No se pudo descargar el video desde ninguna API');

            await conn.sendFile(m.chat, media.data.url, media.data.fileName, getRequiredPluginMessage('downloads.tiktok.caption'), m);
            await conn.sendMessage(m.chat, {text: getRequiredPluginMessage('downloads.tiktok.completed'), edit: key});
        } catch (e: unknown) {
            logInfo(e);
            m.react('❌');
        } finally {
            userRequests.release(m.sender);
        }
    },
});
