import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {getAvailableMp4s, pickRandomFile} from './gif-media.js';
import path from 'path';
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js';
import {loadCachedJsonResource} from '../../lib/local-json-resource.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
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

export default definePlugin({
    help: Object.values(reactions).map(reaction => reaction.help),
    tags: ['fun'],
    command: buildCommandRegex(aliasMap),
    register: false,
    async execute(m, {conn, participants, command, isAdmin, isOwner, isGroupCreator}) {
    try {
        const reaction = aliasMap[command.toLowerCase()];
        if (!reaction) return m.reply(getRequiredPluginMessage('messages.gifReactions.missingReaction'));
        const nsfwEnabled = reaction.adult ? canUseNsfw(await getNsfwSettings(m.chat), {isAdmin, isOwner, isGroupCreator}) : false;

        const rawMentions: string[] = Array.isArray(m.mentionedJid) ? [...m.mentionedJid] : [];
        if (m.quoted?.sender) rawMentions.push(m.quoted.sender);
        if (!rawMentions.length) rawMentions.push(m.sender);

        const selectedFolder = nsfwEnabled && reaction.nsfwFolder ? reaction.nsfwFolder : reaction.folder;
        const folder = path.resolve(process.cwd(), selectedFolder);
        const mp4s = getAvailableMp4s(folder);

        if (!mp4s.length) {
            await m.reply(buildFfmpegHint(selectedFolder));
            return;
        }

        const groupParticipants = getParticipantsFast(conn, m.chat, participants);
        const senderResolved = resolveMention(m.sender, groupParticipants);
        const mentionedResolved: ResolvedMention[] = rawMentions.map(jid => resolveMention(jid, groupParticipants));
        const mentions = Array.from(new Set([
            senderResolved.mentionJid,
            ...mentionedResolved.map(mention => mention.mentionJid),
        ]));

        const captionTemplate = nsfwEnabled && reaction.nsfwCaption ? reaction.nsfwCaption : reaction.caption;
        const caption = formatReactionCaption(captionTemplate, senderResolved.tag, mentionedResolved.map(mention => mention.tag));

        await conn.sendMessage(m.chat, {
            video: {url: path.join(folder, pickRandomFile(mp4s))},
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption,
            mentions,
            contextInfo: {mentionedJid: mentions},
        }, {quoted: m});
    } catch (e: unknown) {
        logError(e);
        m.react('❌️');
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

function buildFfmpegHint(folder: string): string {
    return renderTemplate(getRequiredPluginMessage('messages.gifReactions.ffmpegHint'), {folder});
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
