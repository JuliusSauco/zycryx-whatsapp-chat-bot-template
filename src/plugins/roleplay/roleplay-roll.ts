import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {
    acceptAllSlutSessions, acceptSlutSession, endSlutRole, findOpenSlutSession,
    findSlutActionContract, listAvailableSlutSessions, openSlutRoleSession,
} from '../../services/roleplay.service.js';
import {getNsfwSettings} from '../../services/group-settings.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {getParticipantsFast, resolveMention} from '../../utils/mention.js';
import {canUseNsfwGifs} from '../../utils/nsfw-access.js';
import {pickSlutResponse, resolveSlutAction} from './slut-actions.js';

const END_ALIASES = new Set(['end', 'fin', 'finalizar', 'terminar', 'detener', 'cerrar']);
const ACTION_MENU_ALIASES = new Set(['acciones', 'actions', 'menu', 'ayuda', 'help']);

function durationLine(mode: 'fixed' | 'indefinite', hours: number | null): string {
    return mode === 'indefinite' ? '♾️ *Duración:* Tiempo ilimitado (`i`)' : `⏳ *Duración:* ${hours} hora${hours === 1 ? '' : 's'}`;
}

function billingLine(mode: 'fixed' | 'indefinite'): string {
    return mode === 'indefinite'
        ? 'Se cobrará una nueva hora automáticamente hasta que finalice el contrato o falten Coins en la E-Wallet.'
        : 'Las horas fueron prepagadas. Cada hora se acredita al beneficiario cuando comienza; las horas no iniciadas se devuelven al finalizar antes.';
}

function removeControlArguments(args: string[]): string {
    const result: string[] = [];
    for (let index = 0; index < args.length; index++) {
        const value = args[index]!;
        if (['--todos', '--all'].includes(value.toLowerCase())) continue;
        if (['--precio', '--price'].includes(value.toLowerCase())) {
            index++;
            continue;
        }
        if (value.startsWith('@')) continue;
        result.push(value);
    }
    return result.join(' ').trim().replace(/\s+/g, ' ').slice(0, 500);
}

function requestedPrice(args: string[]): number | undefined {
    const index = args.findIndex(value => ['--precio', '--price'].includes(value.toLowerCase()));
    if (index < 0) return undefined;
    return Number(args[index + 1]);
}

export default defineSdkPlugin({
    help: ['roll', 'roll slut [--precio N] [@usuario] [mensaje]', 'roll aceptar @usuario [horas|i]', 'roll aceptar todos', 'roll slut acciones', 'roll slut end [@usuario]'],
    tags: ['roleplay'],
    feature: 'roleplay',
    command: ['roll', 'slut'],
    group: true,
    register: true,
    async execute(m, {sdk, isGroupCreator}) {
        const prefix = sdk.usedPrefix || '.';
        const args = [...sdk.args];
        const shortcut = sdk.command === 'slut';
        const root = shortcut ? 'slut' : (args.shift()?.toLowerCase() ?? 'menu');

        if (['menu', 'roles', 'roleplay', 'ayuda', 'help'].includes(root)) {
            return sdk.reply.message('roleplay.menu', {prefix});
        }

        if (['aceptar', 'accept', 'contratar'].includes(root)) {
            const first = args[0]?.toLowerCase();
            if (['todos', 'all'].includes(first ?? '')) {
                const available = await listAvailableSlutSessions(sdk.chatId, sdk.sender);
                const result = await acceptAllSlutSessions(sdk.chatId, sdk.sender, available.length);
                if (result.kind === 'none') return sdk.reply.message('roleplay.sessionNotFound');
                if (result.kind === 'session_full') return sdk.reply.message('roleplay.sessionFull');
                if (result.kind === 'insufficient_wallet') return sdk.reply.message('roleplay.insufficientWallet', {prefix});
                if (result.kind !== 'success') return sdk.reply.message('roleplay.sessionNotFound');
                await sdk.reply.message('roleplay.acceptedAll', {
                    contracts: result.contracts.length,
                    total: formatThousandsDot(result.totalCoins),
                    balance: formatThousandsDot(result.walletCoins),
                });
                return sdk.reply.message('roleplay.actionsMenu', {prefix});
            }
            const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
            const rawTarget = m.mentionedJid[0] || m.quoted?.sender;
            if (!rawTarget) return sdk.reply.message('roleplay.acceptUsage', {prefix});
            const target = resolveMention(rawTarget, participants);
            const session = await findOpenSlutSession(sdk.chatId, target.mentionJid)
                || (target.mentionJid !== rawTarget ? await findOpenSlutSession(sdk.chatId, rawTarget) : null);
            if (!session) return sdk.reply.message('roleplay.sessionNotFound');
            const duration = args.find(value => value.toLowerCase() === 'i' || /^\d+$/.test(value));
            const result = await acceptSlutSession({sessionId: session.id, buyerId: sdk.sender, duration});
            if (result.kind === 'invalid_hours') return sdk.reply.message('roleplay.invalidHours', {maximum: result.maximum});
            if (result.kind === 'session_full') return sdk.reply.message('roleplay.sessionFull');
            if (result.kind === 'already_active') return sdk.reply.message('roleplay.alreadyActive');
            if (result.kind === 'insufficient_wallet') return sdk.reply.message('roleplay.insufficientWallet', {prefix});
            if (result.kind !== 'success') return sdk.reply.message('roleplay.sessionNotFound');
            const beneficiary = resolveMention(result.contract.beneficiaryId, participants);
            const buyer = resolveMention(result.contract.buyerId, participants);
            await sdk.sendMessage({
                text: sdk.content.renderMessage('roleplay.contract', {
                    beneficiary: beneficiary.tag,
                    buyer: buyer.tag,
                    level: result.session.beneficiaryLevel,
                    price: formatThousandsDot(result.contract.hourlyPriceCoins),
                    durationLine: durationLine(result.contract.mode, result.contract.requestedHours),
                    charged: formatThousandsDot(result.prepaidCoins),
                    buyers: result.session.activeBuyerCount,
                    billingLine: billingLine(result.contract.mode),
                    prefix,
                }),
                mentions: [beneficiary.mentionJid, buyer.mentionJid],
            });
            return sdk.reply.message('roleplay.actionsMenu', {prefix});
        }

        if (root !== 'slut') return sdk.reply.message('roleplay.menu', {prefix});
        const action = args[0]?.toLowerCase();
        if (ACTION_MENU_ALIASES.has(action ?? '')) return sdk.reply.message('roleplay.actionsMenu', {prefix});

        if (END_ALIASES.has(action ?? '')) {
            const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
            const rawTarget = m.mentionedJid[0] || m.quoted?.sender || undefined;
            const counterpartyId = rawTarget ? resolveMention(rawTarget, participants).mentionJid : undefined;
            const result = await endSlutRole({
                groupId: sdk.chatId,
                actorId: sdk.sender,
                counterpartyId,
            });
            if (result.kind === 'not_found') return sdk.reply.message('roleplay.endNotFound');
            if (result.kind === 'ambiguous') return sdk.reply.message('roleplay.endAmbiguous');
            if (result.kind !== 'success') return sdk.reply.message('roleplay.endNotFound');
            return sdk.reply.message('roleplay.ended', {
                contracts: result.endedContracts,
                refund: formatThousandsDot(result.refundedCoins),
                sessionStatus: result.sessionClosed ? 'finalizada' : 'activa para otros compradores',
            });
        }

        if (['responder', 'respond', 'reply'].includes(action ?? '')) {
            const quotedMessageId = m.quoted?.key?.id || m.quoted?.id;
            if (!quotedMessageId) return sdk.reply.message('roleplay.responseNeedsQuote');
            const context = await findSlutActionContract(quotedMessageId, sdk.sender);
            if (!context || context.actorRole !== 'beneficiary') return sdk.reply.message('roleplay.responseNeedsQuote');
            const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
            const beneficiary = resolveMention(sdk.sender, participants);
            const buyer = resolveMention(context.counterpartyId, participants);
            const custom = args.slice(1).join(' ').trim().slice(0, 500);
            let message = custom;
            if (!message) {
                const resolvedAction = resolveSlutAction(context.actionCode);
                if (!resolvedAction) return sdk.reply.message('roleplay.invalidAction', {prefix});
                const settings = await getNsfwSettings(sdk.chatId);
                const nsfwEnabled = canUseNsfwGifs(settings, {
                    isAdmin: sdk.isAdmin, isOwner: sdk.isOwner, isGroupCreator,
                });
                message = sdk.content.renderTemplate(pickSlutResponse(resolvedAction, nsfwEnabled).text, {
                    beneficiary: beneficiary.tag,
                    buyer: buyer.tag,
                    action: resolvedAction.displayName,
                    command: context.actionCode,
                    price: formatThousandsDot(context.contract.hourlyPriceCoins),
                    duration: context.contract.mode === 'indefinite' ? 'tiempo ilimitado' : `${context.contract.requestedHours} horas`,
                    customMessageBlock: '',
                });
            }
            return sdk.sendMessage({
                text: sdk.content.renderMessage('roleplay.manualResponse', {
                    beneficiary: beneficiary.tag, buyer: buyer.tag, message,
                }),
                mentions: [beneficiary.mentionJid, buyer.mentionJid],
            });
        }

        const participants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants);
        const target = m.mentionedJid[0] ? resolveMention(m.mentionedJid[0], participants) : null;
        const price = requestedPrice(args);
        const message = removeControlArguments(args)
            || 'Tengo una nueva oferta disponible para quienes quieran compartir una sesión conmigo.';
        const result = await openSlutRoleSession({
            groupId: sdk.chatId,
            beneficiaryId: sdk.sender,
            targetId: target?.mentionJid ?? null,
            requestedPriceCoins: price,
            offerMessage: message,
        });
        if (result.kind === 'missing_entitlement') return sdk.reply.message('roleplay.licenseRequired', {prefix});
        if (result.kind === 'session_already_open') return sdk.reply.message('roleplay.sessionAlreadyOpen');
        if (result.kind === 'invalid_level') return sdk.reply.message('roleplay.invalidLevel');
        if (result.kind === 'invalid_price') return sdk.reply.message('roleplay.invalidPrice', {
            minimum: formatThousandsDot(result.minimum), maximum: formatThousandsDot(result.maximum),
        });
        if (result.kind !== 'success') return sdk.reply.message('roleplay.invalidTarget');
        const beneficiary = resolveMention(sdk.sender, participants);
        const mentions = target
            ? [beneficiary.mentionJid, target.mentionJid]
            : Array.from(new Set(participants.map(participant => participant.id).filter(Boolean)));
        return sdk.sendMessage({
            text: sdk.content.renderMessage('roleplay.offer', {
                beneficiary: beneficiary.tag,
                level: result.session.beneficiaryLevel,
                price: formatThousandsDot(result.session.hourlyPriceCoins),
                buyers: result.session.activeBuyerCount,
                scope: target ? `dirigida a ${target.tag}` : 'disponible para todos',
                message: result.session.offerMessage,
                prefix,
            }),
            mentions,
            contextInfo: {mentionedJid: mentions},
        });
    },
});
