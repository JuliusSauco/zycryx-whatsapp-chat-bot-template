import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {formatReactionFallbackNotice, selectReactionMedia} from './gif-media.js';
import path from 'path';
import {getParticipantsFast, resolveMention, type ParticipantLike, type ResolvedMention} from '../../utils/mention.js';
import {cleanJid} from '../../utils/jid.js';
import {loadCachedJsonResource} from '../../lib/local-json-resource.js';
import {getNsfwSettings} from '../../services/group-settings.service.js';
import {canUseNsfwGifs} from '../../utils/nsfw-access.js';

interface ReactionResource {
    help: string;
    commands: string[];
    folder: string;
    nsfwFolder?: string;
    caption: string;
    nsfwCaption?: string;
    adult?: boolean;
    targetMode?: 'optional' | 'required' | 'random-group-member';
}

type ReactionManifest = Record<string, ReactionResource>;

const REACTIONS_MANIFEST_PATH = 'resources/data/reactions.json';
const reactions = loadCachedJsonResource<ReactionManifest>(REACTIONS_MANIFEST_PATH) || {};
const aliasMap = buildReactionAliasMap(reactions);

export default defineSdkPlugin({
    help: Object.values(reactions).map(reaction => reaction.help),
    tags: ['fun'],
    feature: 'gifs',
    command: buildCommandRegex(aliasMap),
    register: false,
    async execute(m, {sdk, isGroupCreator}) {
    try {
        const reaction = aliasMap[sdk.command.toLowerCase()];
        if (!reaction) return sdk.reply.message('messages.gifReactions.missingReaction');
        const nsfwEnabled = reaction.adult ? canUseNsfwGifs(await getNsfwSettings(sdk.chatId), {isAdmin: sdk.isAdmin, isOwner: sdk.isOwner, isGroupCreator}) : false;

        const explicitMentions: string[] = Array.isArray(m.mentionedJid) ? [...m.mentionedJid] : [];
        const rawMentions = [...explicitMentions];
        if (m.quoted?.sender) rawMentions.push(m.quoted.sender);

        const groupParticipants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
        if (reaction.targetMode === 'random-group-member') {
            if (!sdk.isGroup) return sdk.reply.message('messages.gifReactions.groupOnly');
            const randomTarget = selectRandomReactionTarget(
                groupParticipants,
                sdk.sender,
                sdk.conn.user?.id,
            );
            if (!randomTarget) return sdk.reply.message('messages.gifReactions.noRandomTarget');
            rawMentions.splice(0, rawMentions.length, randomTarget.mentionJid);
        } else if (reaction.targetMode === 'required') {
            const senderJid = cleanJid(resolveMention(sdk.sender, groupParticipants).mentionJid);
            const target = explicitMentions
                .map(jid => resolveMention(jid, groupParticipants))
                .find(mention => cleanJid(mention.mentionJid) !== senderJid);
            if (!target) {
                return sdk.reply.message('messages.gifReactions.missingTarget', {
                    command: `${sdk.usedPrefix}${sdk.command} @usuario`,
                });
            }
            rawMentions.splice(0, rawMentions.length, target.mentionJid);
        } else if (!rawMentions.length) {
            rawMentions.push(sdk.sender);
        }

        const publicFolder = path.resolve(process.cwd(), reaction.folder);
        const nsfwFolder = reaction.nsfwFolder ? path.resolve(process.cwd(), reaction.nsfwFolder) : undefined;
        const media = selectReactionMedia({publicFolder, nsfwFolder, nsfwEnabled});
        const fallbackNotice = formatReactionFallbackNotice({
            reason: media.fallbackReason,
            requestedFolder: media.requestedFolder,
        });
        if (!media.filePath) {
            if (media.fallbackReason === 'nsfw-required') return;
            return sdk.reply.text(fallbackNotice);
        }

        const senderResolved = resolveMention(sdk.sender, groupParticipants);
        const mentionedResolved: ResolvedMention[] = rawMentions.map(jid => resolveMention(jid, groupParticipants));
        const mentions = Array.from(new Set([
            senderResolved.mentionJid,
            ...mentionedResolved.map(mention => mention.mentionJid),
        ]));

        const captionTemplate = nsfwEnabled && reaction.nsfwCaption ? reaction.nsfwCaption : reaction.caption;
        const caption = [
            formatReactionCaption(captionTemplate, senderResolved.tag, mentionedResolved.map(mention => mention.tag)),
            fallbackNotice,
        ].filter(Boolean).join('\n\n');

        await sdk.sendMessage({
            video: {url: media.filePath},
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption,
            mentions,
            contextInfo: {mentionedJid: mentions},
        });
    } catch (e: unknown) {
        logError(e);
        sdk.reply.react('❌️');
    }
    }
});

export function selectRandomReactionTarget(
    participants: ParticipantLike[],
    senderJid: string,
    botJid = '',
    random: () => number = Math.random,
): ResolvedMention | null {
    const excluded = new Set(
        [senderJid, botJid]
            .filter(Boolean)
            .map(jid => cleanJid(resolveMention(jid, participants).mentionJid)),
    );
    const seen = new Set<string>();
    const candidates = participants.flatMap(participant => {
        if (!participant.id) return [];
        const resolved = resolveMention(participant.id, participants);
        const canonicalJid = cleanJid(resolved.mentionJid);
        if (!canonicalJid || excluded.has(canonicalJid) || seen.has(canonicalJid)) return [];
        seen.add(canonicalJid);
        return [resolved];
    });

    if (!candidates.length) return null;
    const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);
    return candidates[index];
}

function buildReactionAliasMap(manifest: ReactionManifest): Record<string, ReactionResource> {
    const map: Record<string, ReactionResource> = {};
    for (const reaction of Object.values(manifest)) {
        for (const command of reaction.commands) {
            map[command.toLowerCase()] = reaction;
        }
    }
    return map;
}

function buildCommandRegex(map: Record<string, ReactionResource>): RegExp {
    const commands = Object.keys(map).map(escapeRegExp);
    return new RegExp(`^(${commands.join('|')})$`, 'i');
}

function formatReactionCaption(template: string, senderTag: string, targetTags: string[]): string {
    return template
        .replaceAll('{sender}', `*${senderTag}*`)
        .replaceAll('{targets}', `*${targetTags.join(', ')}*`);
}


function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
