import path from 'node:path';
import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {formatReactionFallbackNotice, selectReactionMedia} from '../messages/gif-media.js';
import {
    listActiveSlutCounterparties, recordSlutActionMessage,
} from '../../services/roleplay.service.js';
import {getNsfwSettings} from '../../services/group-settings.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {getParticipantsFast, resolveMention} from '../../utils/mention.js';
import {canUseNsfwGifs} from '../../utils/nsfw-access.js';
import {pickSlutResponse, resolveSlutAction} from './slut-actions.js';

const previousResponses = new Map<string, string>();

function customActionMessage(args: string[]): string {
    return args.slice(1).filter(value => !value.startsWith('@')).join(' ').trim().slice(0, 500);
}

export default defineSdkPlugin({
    help: ['r-slut menu', 'r-slut <acción> [@usuario] [mensaje]'],
    tags: ['roleplay'],
    feature: 'roleplay',
    command: ['r-slut', 'rslut'],
    group: true,
    register: true,
    executionPolicy: {profile: 'media'},
    async execute(m, {sdk, isGroupCreator}) {
        const prefix = sdk.usedPrefix || '.';
        const command = sdk.args[0]?.toLowerCase();
        if (!command || ['menu', 'acciones', 'actions', 'ayuda', 'help'].includes(command)) {
            return sdk.reply.message('roleplay.actionsMenu', {prefix});
        }
        const action = resolveSlutAction(command);
        if (!action) return sdk.reply.message('roleplay.invalidAction', {prefix});
        const relationships = await listActiveSlutCounterparties(sdk.chatId, sdk.sender);
        if (!relationships.length) return sdk.reply.message('roleplay.noActiveContract');

        const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
        const rawTarget = m.mentionedJid[0] || m.quoted?.sender;
        const resolvedTarget = rawTarget ? resolveMention(rawTarget, participants) : null;
        const selected = resolvedTarget
            ? relationships.filter(item => {
                const resolved = resolveMention(item.counterpartyId, participants);
                return resolved.mentionJid === resolvedTarget.mentionJid || item.counterpartyId === rawTarget;
            })
            : relationships;
        if (!selected.length) return sdk.reply.message('roleplay.targetNotContracted');

        const settings = await getNsfwSettings(sdk.chatId);
        const nsfwEnabled = action.reaction.adult && canUseNsfwGifs(settings, {
            isAdmin: sdk.isAdmin, isOwner: sdk.isOwner, isGroupCreator,
        });
        const publicFolder = path.resolve(process.cwd(), action.reaction.folder);
        const nsfwFolder = action.reaction.nsfwFolder
            ? path.resolve(process.cwd(), action.reaction.nsfwFolder)
            : undefined;
        const customMessage = customActionMessage(sdk.args);
        const actor = resolveMention(sdk.sender, participants);

        for (const relationship of selected.slice(0, 5)) {
            const target = resolveMention(relationship.counterpartyId, participants);
            const media = selectReactionMedia({publicFolder, nsfwFolder, nsfwEnabled: Boolean(nsfwEnabled)});
            const fallbackNotice = formatReactionFallbackNotice({
                reason: media.fallbackReason,
                requestedFolder: media.requestedFolder,
            });
            if (!media.filePath) {
                if (media.fallbackReason === 'nsfw-required') {
                    await sdk.reply.text('⚠️ Esta acción solo tiene un GIF explícito y los GIFs NSFW no están habilitados para ti.');
                    continue;
                }
                await sdk.reply.text(fallbackNotice);
                continue;
            }
            const customMessageBlock = customMessage ? `\n\n💬 _“${customMessage}”_` : '';
            const caption = [sdk.content.renderMessage('roleplay.actionCaption', {
                actionTitle: action.displayName.toUpperCase(),
                actor: actor.tag,
                target: target.tag,
                command,
                customMessageBlock,
                price: formatThousandsDot(relationship.contract.hourlyPriceCoins),
            }), fallbackNotice].filter(Boolean).join('\n\n');
            const sent = await sdk.sendMessage({
                video: {url: media.filePath},
                mimetype: 'video/mp4',
                gifPlayback: true,
                caption,
                mentions: [actor.mentionJid, target.mentionJid],
                contextInfo: {mentionedJid: [actor.mentionJid, target.mentionJid]},
            });
            const messageId = sent.key?.id;
            if (messageId) {
                await recordSlutActionMessage({
                    messageId,
                    contractId: relationship.contract.id,
                    groupId: sdk.chatId,
                    actorId: sdk.sender,
                    targetId: relationship.counterpartyId,
                    actionCode: command,
                });
            }

            if (relationship.actorRole === 'buyer') {
                const cacheKey = `${relationship.contract.id}:${action.code}`;
                const response = pickSlutResponse(action, Boolean(nsfwEnabled), previousResponses.get(cacheKey));
                previousResponses.set(cacheKey, response.id);
                const responseText = sdk.content.renderTemplate(response.text, {
                    beneficiary: target.tag,
                    buyer: actor.tag,
                    action: action.displayName,
                    command,
                    price: formatThousandsDot(relationship.contract.hourlyPriceCoins),
                    duration: relationship.contract.mode === 'indefinite'
                        ? 'tiempo ilimitado'
                        : `${relationship.contract.requestedHours} horas`,
                    customMessageBlock,
                });
                const responseSent = await sdk.sendMessage({
                    text: responseText,
                    mentions: [actor.mentionJid, target.mentionJid],
                    contextInfo: {mentionedJid: [actor.mentionJid, target.mentionJid]},
                });
                const responseMessageId = responseSent.key?.id;
                if (responseMessageId) {
                    await recordSlutActionMessage({
                        messageId: responseMessageId,
                        contractId: relationship.contract.id,
                        groupId: sdk.chatId,
                        actorId: sdk.sender,
                        targetId: relationship.counterpartyId,
                        actionCode: command,
                    });
                }
            }
        }
    },
});
