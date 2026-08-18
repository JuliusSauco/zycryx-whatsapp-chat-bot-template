import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {downloadThreadsMedia, type ThreadsProviderMedia} from '../../providers/downloads/threads.provider.js';
import type {proto} from '@whiskeysockets/baileys';
import {renderDownloadFailure} from './download-error.js';

interface UserRequest {
    active: boolean;
    message: {key?: proto.IMessageKey | null; chat: string; fromMe: boolean};
}

const userRequests = createUserRequestLocks<UserRequest>('downloads:threads');

export default defineSdkPlugin({
    help: ['thread'],
    tags: ['downloader'],
    command: /^(thread|threads|threaddl)$/i,
    register: true,
    limit: 4,
    alternativeCoins: 40,
    async execute(m, {sdk}) {
        if (!sdk.args[0]) return sdk.reply.message('downloads.threads.missingUrl', {
            command: sdk.usedPrefix + sdk.command,
        });

        const activeRequest = userRequests.get(sdk.sender);
        if (!await userRequests.acquire(sdk.sender, {active: true, message: {chat: sdk.chatId, fromMe: true}})) return sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.threads.locked', {
            user: sdk.sender.split('@')[0],
        }), activeRequest?.message || m);

        const {key} = await sdk.sendMessage({text: sdk.content.message('downloads.threads.downloading')});
        userRequests.setPayload(sdk.sender, {active: true, message: {key, chat: sdk.chatId, fromMe: true}});
        await sdk.reply.react('⌛');

        try {
            const media = await downloadThreadsMedia(sdk.args[0]);
            if (!media.data) {
                return sdk.conn.sendMessage(sdk.chatId, {text: renderDownloadFailure('threads', media.failures), edit: key});
            }

            await sdk.sendFile(media.data.url, media.data.fileName, getThreadsCaption(sdk.content, media.data));
            await sdk.reply.react('✅');
            await sdk.conn.sendMessage(sdk.chatId, {text: sdk.content.message('downloads.threads.completed'), edit: key});
        } catch (e: unknown) {
            await sdk.reply.react('❌');
            await sdk.conn.sendMessage(sdk.chatId, {
                text: sdk.content.renderMessage('downloads.threads.error', {error: String(e)}),
                edit: key,
            });
            logInfo(e);
        } finally {
            await userRequests.release(sdk.sender);
        }
    },
});

function getThreadsCaption(content: PluginContentSdk, media: ThreadsProviderMedia): string {
    return media.type === 'image'
        ? content.message('downloads.threads.imageCaption')
        : content.message('downloads.threads.videoCaption');
}
