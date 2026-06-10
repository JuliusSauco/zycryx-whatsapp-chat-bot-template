import {definePlugin} from '../../core/define-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {replyReportableError} from '../../lib/reply-helpers.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadDriveFile} from '../../providers/downloads/drive.provider.js';
import type {QuotedMessage} from '../../types/context.js';

const userCaptions = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['drive'].map(v => v + ' <url>'),
    tags: ['downloader'],
    command: /^(drive|drivedl|dldrive|gdrive)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, usedPrefix, command}) {
        if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.drive.missingUrl'), {
            command: usedPrefix + command,
        }));

        if (!userRequests.acquire(m.sender)) {
            await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.drive.locked'), {
                user: m.sender.split('@')[0],
            }), userCaptions.get(m.sender) || m);
            return;
        }

        await m.react('📥');
        try {
            const waitMessageSent = await conn.reply(m.chat, getRequiredPluginMessage('downloads.drive.progress'), m);
            userCaptions.set(m.sender, waitMessageSent);
            const fileResult = await downloadDriveFile(args[0]);
            if (!fileResult.data) throw new Error('No se pudo descargar el archivo desde ninguna API');

            await conn.sendMessage(m.chat, {
                document: {url: fileResult.data.url},
                mimetype: fileResult.data.mimetype,
                fileName: fileResult.data.filename,
                caption: undefined,
            }, {quoted: m});
            await m.react('✅');
        } catch (e: unknown) {
            await m.react('❌');
            await replyReportableError(m, e);
            logInfo(e);
        } finally {
            userRequests.release(m.sender);
        }
    },
});
