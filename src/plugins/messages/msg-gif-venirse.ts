import path from 'path';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {logError} from '../../lib/logger.js';
import {cleanJid} from '../../utils/jid.js';
import {getParticipantsFast, resolveMention} from '../../utils/mention.js';
import {getAvailableMp4s, pickRandomFile} from './gif-media.js';

const NSFW_GIF_FOLDER = path.join(process.cwd(), 'resources', 'media', 'reaction-gifs', 'vn', 'nsfw');
const NSFW_GIF_FOLDER_LABEL = 'resources/media/reaction-gifs/vn/nsfw';

export default defineSdkPlugin({
    help: ['msg-gif-venirse'],
    tags: ['fun', 'nsfw'],
    feature: 'nsfw',
    command: /^venirse$/i,
    group: true,
    register: false,
    executionPolicy: {profile: 'media'},
    async execute(m, {sdk}) {
        try {
            const rawTarget = m.mentionedJid[0] || m.quoted?.sender;
            if (!rawTarget) {
                await sdk.reply.message('messages.gifVenirse.missingTarget');
                return;
            }

            const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
            const sender = resolveMention(sdk.sender, participants);
            const target = resolveMention(rawTarget, participants);
            if (cleanJid(sender.mentionJid) === cleanJid(target.mentionJid)) {
                await sdk.reply.message('messages.gifVenirse.missingTarget');
                return;
            }

            const mp4s = getAvailableMp4s(NSFW_GIF_FOLDER);
            if (!mp4s.length) {
                await sdk.reply.message('messages.gifReactions.ffmpegHint', {folder: NSFW_GIF_FOLDER_LABEL});
                return;
            }

            const mentions = [sender.mentionJid, target.mentionJid];
            const caption = sdk.content.renderMessage('messages.gifVenirse.caption', {
                sender: sender.tag,
                target: target.tag,
            });

            await sdk.sendMessage({
                video: {url: path.join(NSFW_GIF_FOLDER, pickRandomFile(mp4s))},
                mimetype: 'video/mp4',
                gifPlayback: true,
                caption,
                mentions,
                contextInfo: {mentionedJid: mentions},
            });
        } catch (error: unknown) {
            logError(error);
            await sdk.reply.react('❌️');
        }
    },
});
