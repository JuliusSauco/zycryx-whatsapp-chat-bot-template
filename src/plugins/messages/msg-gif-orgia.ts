import path from 'path';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {logError} from '../../lib/logger.js';
import {cleanJid} from '../../utils/jid.js';
import {getParticipantsFast, resolveMention, type ParticipantLike, type ResolvedMention} from '../../utils/mention.js';
import {getAvailableMp4s, pickRandomFile} from './gif-media.js';

const NSFW_GIF_FOLDER = path.join(process.cwd(), 'resources', 'media', 'reaction-gifs', 'ogi', 'nsfw');
const NSFW_GIF_FOLDER_LABEL = 'resources/media/reaction-gifs/ogi/nsfw';
const MINIMUM_EXPLICIT_TARGETS = 3;
const RANDOM_TARGET_COUNT = 3;

export function resolveOrgiaTargets(
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

export function selectRandomOrgiaTargets(
    participants: ParticipantLike[],
    senderJid: string,
    count = RANDOM_TARGET_COUNT,
    random: () => number = Math.random,
): ResolvedMention[] {
    const candidates = resolveOrgiaTargets(
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
    help: ['msg-gif-orgia'],
    tags: ['fun', 'nsfw'],
    feature: 'nsfw',
    command: /^orgia$/i,
    group: true,
    register: false,
    executionPolicy: {profile: 'media'},
    async execute(m, {sdk}) {
        try {
            const rawTargets: string[] = [];
            if (m.quoted?.sender) rawTargets.push(m.quoted.sender);
            if (Array.isArray(m.mentionedJid)) rawTargets.push(...m.mentionedJid);

            const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
            const sender = resolveMention(sdk.sender, participants);
            const targets = rawTargets.length
                ? resolveOrgiaTargets(rawTargets, sdk.sender, participants)
                : selectRandomOrgiaTargets(participants, sdk.sender);
            const minimumTargets = rawTargets.length ? MINIMUM_EXPLICIT_TARGETS : RANDOM_TARGET_COUNT;

            if (targets.length < minimumTargets) {
                await sdk.reply.message('messages.gifOrgia.notEnoughPeople');
                return;
            }

            const mp4s = getAvailableMp4s(NSFW_GIF_FOLDER);
            if (!mp4s.length) {
                await sdk.reply.message('messages.gifReactions.ffmpegHint', {folder: NSFW_GIF_FOLDER_LABEL});
                return;
            }

            const mentions = Array.from(new Set([
                sender.mentionJid,
                ...targets.map(target => target.mentionJid),
            ]));
            const caption = sdk.content.renderMessage('messages.gifOrgia.caption', {
                sender: sender.tag,
                targets: targets.map(target => target.tag).join(', '),
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
