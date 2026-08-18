import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {createPendingActionStore} from '../../lib/ephemeral-state.js';
import {getWallet, isTransferableWalletResource, listWalletTransferHistory, transferWalletResource} from '../../services/wallet.service.js';
import type {BotMessage} from '../../types/message.js';
import type {TransferableWalletResource} from '../../domain/users.js';
import {content} from '../../services/content.service.js';
import {isEconomyInfoRequest} from './economy-info.helpers.js';

interface TransferConfirmation {
    sender: string;
    to: string;
    message: BotMessage;
    type: TransferableWalletResource;
    count: number;
}

const confirmations = createPendingActionStore<TransferConfirmation>({
    ttlMs: 60 * 1000,
    onExpire: (_sender, confirmation) => {
        void confirmation.message.reply(content.message('economy.transfer.timeout'));
    },
});

export const TRANSFER_COMMANDS = ['payxp', 'transfer', 'darxp', 'dar', 'enviar', 'transferir'] as const;

export default defineSdkPlugin({
    help: ['transfer [tipo] [cantidad] [@tag]', 'transfer --info', 'transfer history [página]'],
    tags: ['economy'],
    feature: 'rpg',
    command: [...TRANSFER_COMMANDS],
    register: true,
    async before(m) {
        const confirmation = confirmations.get(m.sender);
        if (!confirmation || !m.originalText || m.id === confirmation.message.id) return;

        const {sender, message, to, type, count} = confirmation;
        const [user, userTo] = await Promise.all([getWallet(sender), getWallet(to)]);
        if (!user || !userTo) return m.reply(content.message('economy.transfer.invalidUsers'));
        if (/^no$/i.test(m.originalText)) {
            confirmations.cancel(sender);
            return m.reply(content.message('economy.transfer.cancelled'));
        }
        if (/^si$/i.test(m.originalText)) {
            if (!isTransferableWalletResource(type)) return m.reply(content.message('economy.transfer.invalidResource'));
            const transferred = await transferWalletResource({from: sender, to, resource: type, amount: count, operation: 'transfer'});
            if (!transferred) return m.reply(content.renderMessage('economy.transfer.notEnough', {resource: type.toUpperCase()}));
            await m.reply(content.renderMessage('economy.transfer.success', {
                amount: count,
                resource: type,
                user: to.replace(/@s\.whatsapp\.net/g, ''),
            }), null, {mentions: [to]});
            confirmations.cancel(sender);
        }
    },
    async execute(m, {conn, args, usedPrefix, command, isGroup, sdk}) {
        if (isEconomyInfoRequest(args)) return sdk.reply.message('economy.transfer.guide', {prefix: usedPrefix});
        if (isTransferHistoryRequest(args)) {
            if (isGroup) return sdk.reply.message('economy.transfer.historyPrivate', {prefix: usedPrefix});
            const page = parseHistoryPage(args[1]);
            if (page === null) return sdk.reply.message('economy.transfer.historyInvalidPage', {prefix: usedPrefix});
            const history = await listWalletTransferHistory(m.sender, page);
            if (history.totalItems === 0) return sdk.reply.message('economy.transfer.historyEmpty');
            if (page > history.totalPages) {
                return sdk.reply.message('economy.transfer.historyInvalidPage', {prefix: usedPrefix});
            }
            const rows = history.items.map(item => sdk.content.renderMessage('economy.transfer.historyItem', {
                direction: item.amount < 0 ? '📤 Enviada' : '📥 Recibida',
                amount: Math.abs(item.amount),
                resource: item.resource,
                counterparty: (item.counterpartyId ?? 'desconocido').split('@')[0],
                balance: item.balanceAfter,
                date: formatTransferDate(item.createdAt),
            })).join('\n\n');
            const mentions = [...new Set(history.items.map(item => item.counterpartyId).filter((id): id is string => !!id))];
            return sdk.reply.message('economy.transfer.history', {
                rows,
                page: history.page,
                totalPages: history.totalPages,
                totalItems: history.totalItems,
            }, null, {mentions});
        }
        if (confirmations.get(m.sender)) return sdk.reply.message('economy.transfer.alreadyPending');
        const user = await getWallet(m.sender);
        if (!user) return;
        const usage = sdk.content.renderMessage('economy.transfer.usage', {command: usedPrefix + command}).trim();
        const type = (args[0] || '').toLowerCase();
        if (!isTransferableWalletResource(type)) return sdk.reply.text(usage, m.chat, {mentions: await conn.parseMention(usage)});
        const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, isNumber(args[1]) ? parseInt(args[1]!) : 1));
        const who = m.mentionedJid?.[0] || (args[2] ? `${args[2].replace(/[@ .+-]/g, '')}@s.whatsapp.net` : '');
        if (!who) return sdk.reply.message('economy.transfer.missingTarget');
        const userTo = await getWallet(who);
        if (!userTo) return sdk.reply.message('economy.transfer.targetNotFound', {user: who});
        if (user[type] < count) return sdk.reply.message('economy.transfer.notEnough', {resource: type.toUpperCase()});

        const confirm = sdk.content.renderMessage('economy.transfer.confirm', {
            amount: count,
            resource: type,
            user: who.replace(/@s\.whatsapp\.net/g, ''),
        }).trim();
        await conn.reply(m.chat, confirm, m, {mentions: [who]});
        confirmations.start(m.sender, {sender: m.sender, to: who, message: m, type, count});
    },
});

function isNumber(value: string | undefined): boolean {
    return value !== undefined && !Number.isNaN(Number(value));
}

export function isTransferHistoryRequest(args: readonly string[]): boolean {
    return ['history', 'historial'].includes(args[0]?.toLowerCase() ?? '');
}

export function parseHistoryPage(value: string | undefined): number | null {
    if (value === undefined) return 1;
    const page = Number(value);
    return Number.isSafeInteger(page) && page > 0 ? page : null;
}

export function formatTransferDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}
