import {definePlugin} from '../../core/define-plugin.js';
import {logError} from '../../lib/logger.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadMediafireFile} from '../../providers/downloads/mediafire.provider.js';
import type {QuotedMessage} from '../../types/context.js';

const userCaptions = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['mediafire', 'mediafiredl'],
    tags: ['downloader'],
    command: /^(mediafire|mediafiredl|dlmediafire)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, usedPrefix, command}) {
        const sticker = 'https://qu.ax/Wdsb.webp';
        if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.mediafire.missingUrl'), {
            command: usedPrefix + command,
        }));

        if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.mediafire.locked'), {
            user: m.sender.split('@')[0],
        }), userCaptions.get(m.sender) || m);

        await m.react('🚀');
        try {
            const fileResult = await downloadMediafireFile(args[0]);
            if (!fileResult.data) throw new Error('No se pudo descargar el archivo desde ninguna API');

            const file = fileResult.data;
            const caption = renderTemplate(getRequiredPluginMessage('downloads.mediafire.caption'), {
                filename: file.filename,
                filesize: file.filesize,
                mimetype: file.mimetype,
                version: info.vs,
            }).trim();
            const captionMessage = await conn.reply(m.chat, caption, m);
            userCaptions.set(m.sender, captionMessage);
            await conn.sendFile(m.chat, file.url, file.filename, '', m, undefined, {mimetype: file.mimetype, asDocument: true});
            await m.react('✅');
        } catch (e: unknown) {
            await conn.sendFile(m.chat, sticker, 'error.webp', '', m);
            await m.react('❌');
            logError(e);
        } finally {
            userRequests.release(m.sender);
        }
    },
});
