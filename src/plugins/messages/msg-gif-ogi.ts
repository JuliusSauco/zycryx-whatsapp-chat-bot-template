import path from 'path';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {logError} from '../../lib/logger.js';
import {cleanJid} from '../../utils/jid.js';
import {getParticipantsFast, resolveMention, type ParticipantLike, type ResolvedMention} from '../../utils/mention.js';
import {formatReactionFallbackNotice, selectReactionMedia} from './gif-media.js';
import {getNsfwSettings} from '../../services/group-settings.service.js';
import {canUseNsfwGifs} from '../../utils/nsfw-access.js';

const NSFW_GIF_FOLDER = path.join(process.cwd(), 'resources', 'media', 'reaction-gifs', 'ogi', 'nsfw');
const MINIMUM_EXPLICIT_TARGETS = 3;
const RANDOM_TARGET_COUNT = 3;

export function resolveOgiTargets(
    rawTargets: string[],
    senderJid: string,
    participants: ParticipantLike[],
): ResolvedMention[] {
    const sender = resolveMention(senderJid, participants);
    const seen = new Set<string>([cleanJid(sender.mentionJid)]);
    const targets: ResolvedMention[] = [];

    for (const rawTarget of rawTargets) {
        const target = resolveMention(rawTarget, participants);
        const canonicalJid = cleanJid(target.mentionJid);
        if (!canonicalJid || seen.has(canonicalJid)) continue;
        seen.add(canonicalJid);
        targets.push(target);
    }

    return targets;
}

export function selectRandomOgiTargets(
    participants: ParticipantLike[],
    senderJid: string,
    count = RANDOM_TARGET_COUNT,
    random: () => number = Math.random,
): ResolvedMention[] {
    const candidates = resolveOgiTargets(
        participants.map(participant => participant.id || '').filter(Boolean),
        senderJid,
        participants,
    );

    for (let index = candidates.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(random() * (index + 1));
        [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
    }

    return candidates.slice(0, count);
}

export default defineSdkPlugin({
    help: ['msg-gif-ogi'],
    tags: ['fun'],
    feature: 'gifs',
    command: /^orgia$/i,
    group: true,
    register: false,
    executionPolicy: {profile: 'media'},
    async execute(m, {sdk, isGroupCreator}) {
        try {
            const nsfwEnabled = canUseNsfwGifs(await getNsfwSettings(sdk.chatId), {
                isAdmin: sdk.isAdmin,
                isOwner: sdk.isOwner,
                isGroupCreator,
            });
            const rawTargets: string[] = [];
            if (m.quoted?.sender) rawTargets.push(m.quoted.sender);
            if (Array.isArray(m.mentionedJid)) rawTargets.push(...m.mentionedJid);

            const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
            const sender = resolveMention(sdk.sender, participants);
            const targets = rawTargets.length
                ? resolveOgiTargets(rawTargets, sdk.sender, participants)
                : selectRandomOgiTargets(participants, sdk.sender);
            const minimumTargets = rawTargets.length ? MINIMUM_EXPLICIT_TARGETS : RANDOM_TARGET_COUNT;

            if (targets.length < minimumTargets) {
                await sdk.reply.message('messages.gifOgi.notEnoughPeople');
                return;
            }

            const publicFolder = path.join(process.cwd(), 'resources', 'media', 'reaction-gifs', 'ogi');
            const media = selectReactionMedia({publicFolder, nsfwFolder: NSFW_GIF_FOLDER, nsfwEnabled});
            const fallbackNotice = formatReactionFallbackNotice({
                reason: media.fallbackReason,
                requestedFolder: media.requestedFolder,
            });
            if (!media.filePath) {
                if (media.fallbackReason === 'nsfw-required') return;
                return sdk.reply.text(fallbackNotice);
            }

            const mentions = Array.from(new Set([
                sender.mentionJid,
                ...targets.map(target => target.mentionJid),
            ]));
            const baseCaption = sdk.content.renderMessage('messages.gifOgi.caption', {
                sender: sender.tag,
                targets: targets.map(target => target.tag).join(', '),
            });
            const caption = [baseCaption, fallbackNotice].filter(Boolean).join('\n\n');

            await sdk.sendMessage({
                video: {url: media.filePath},
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
