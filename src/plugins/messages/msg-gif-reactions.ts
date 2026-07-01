import {logError} from '../../lib/logger.js';
import {defineSdkPlugin, type PluginSdk} from '../../core/sdk-plugin.js';
import {getAvailableMp4s, pickRandomFile} from './gif-media.js';
import path from 'path';
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js';
import {loadCachedJsonResource} from '../../lib/local-json-resource.js';
import {getNsfwSettings} from '../../services/group-settings.service.js';
import {canUseNsfw} from '../../utils/nsfw-access.js';

interface ReactionResource {
    help: string;
    commands: string[];
    folder: string;
    nsfwFolder?: string;
    caption: string;
    nsfwCaption?: string;
    adult?: boolean;
}

type ReactionManifest = Record<string, ReactionResource>;

const REACTIONS_MANIFEST_PATH = 'resources/data/reactions.json';
const reactions = loadCachedJsonResource<ReactionManifest>(REACTIONS_MANIFEST_PATH) || {};
const aliasMap = buildReactionAliasMap(reactions);

export default defineSdkPlugin({
    help: Object.values(reactions).map(reaction => reaction.help),
    tags: ['fun'],
    command: buildCommandRegex(aliasMap),
    register: false,
    async execute(m, {sdk, isGroupCreator}) {
    try {
        const reaction = aliasMap[sdk.command.toLowerCase()];
        if (!reaction) return sdk.reply.message('messages.gifReactions.missingReaction');
        const nsfwEnabled = reaction.adult ? canUseNsfw(await getNsfwSettings(sdk.chatId), {isAdmin: sdk.isAdmin, isOwner: sdk.isOwner, isGroupCreator}) : false;

        const rawMentions: string[] = Array.isArray(m.mentionedJid) ? [...m.mentionedJid] : [];
        if (m.quoted?.sender) rawMentions.push(m.quoted.sender);
        if (!rawMentions.length) rawMentions.push(sdk.sender);

        const selectedFolder = nsfwEnabled && reaction.nsfwFolder ? reaction.nsfwFolder : reaction.folder;
        const folder = path.resolve(process.cwd(), selectedFolder);
        const mp4s = getAvailableMp4s(folder);

        if (!mp4s.length) {
            await sdk.reply.text(buildFfmpegHint(sdk, selectedFolder));
            return;
        }

        const groupParticipants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
        const senderResolved = resolveMention(sdk.sender, groupParticipants);
        const mentionedResolved: ResolvedMention[] = rawMentions.map(jid => resolveMention(jid, groupParticipants));
        const mentions = Array.from(new Set([
            senderResolved.mentionJid,
            ...mentionedResolved.map(mention => mention.mentionJid),
        ]));

        const captionTemplate = nsfwEnabled && reaction.nsfwCaption ? reaction.nsfwCaption : reaction.caption;
        const caption = formatReactionCaption(captionTemplate, senderResolved.tag, mentionedResolved.map(mention => mention.tag));

        await sdk.sendMessage({
            video: {url: path.join(folder, pickRandomFile(mp4s))},
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

function buildFfmpegHint(sdk: PluginSdk, folder: string): string {
    return sdk.content.renderMessage('messages.gifReactions.ffmpegHint', {folder});
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
