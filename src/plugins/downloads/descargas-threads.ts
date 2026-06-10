import {definePlugin} from '../../core/define-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadThreadsMedia, type ThreadsProviderMedia} from '../../providers/downloads/threads.provider.js';
import type {proto} from '@whiskeysockets/baileys';

interface UserRequest {
    active: boolean;
    message: {key?: proto.IMessageKey | null; chat: string; fromMe: boolean};
}

const userRequests = createUserRequestLocks<UserRequest>();

export default definePlugin({
    help: ['thread'],
    tags: ['downloader'],
    command: /^(thread|threads|threaddl)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, args, usedPrefix, command}) {
        if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.threads.missingUrl'), {
            command: usedPrefix + command,
        }));

        const activeRequest = userRequests.get(m.sender);
        if (activeRequest) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.threads.locked'), {
            user: m.sender.split('@')[0],
        }), activeRequest.message || m);

        const {key} = await conn.sendMessage(m.chat, {text: getRequiredPluginMessage('downloads.threads.downloading')}, {quoted: m});
        userRequests.acquire(m.sender, {active: true, message: {key, chat: m.chat, fromMe: true}});
        await m.react('⌛');

        try {
            const media = await downloadThreadsMedia(args[0]);
            if (!media.data) throw new Error('No media found');

            await conn.sendFile(m.chat, media.data.url, media.data.fileName, getThreadsCaption(media.data), m);
            await m.react('✅');
            await conn.sendMessage(m.chat, {text: getRequiredPluginMessage('downloads.threads.completed'), edit: key});
        } catch (e: unknown) {
            await m.react('❌');
            await conn.sendMessage(m.chat, {
                text: renderTemplate(getRequiredPluginMessage('downloads.threads.error'), {error: String(e)}),
                edit: key,
            });
            logInfo(e);
        } finally {
            userRequests.release(m.sender);
        }
    },
});

function getThreadsCaption(media: ThreadsProviderMedia): string {
    return media.type === 'image'
        ? getRequiredPluginMessage('downloads.threads.imageCaption')
        : getRequiredPluginMessage('downloads.threads.videoCaption');
}
