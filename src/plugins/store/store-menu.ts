import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {
    getSecurityDailyPrice, getSecurityPreviewLevels, getSecurityRemainingFactor,
    type TicketPaymentResource,
} from '../../domain/store.js';
import {buyRaffleTickets, buySecurity, getSecurityOverview} from '../../services/store.service.js';
import {deliverPrivateReceipt} from './store-receipt.helpers.js';

const STORE_COMMANDS = ['store', 'tienda', 'marketplace', 'market', 'compras', 'webstore', 'botstore'] as const;

function dateLabel(value: Date | undefined): string {
    return value ? value.toLocaleString('es-CO', {timeZone: 'America/Bogota'}) : 'Sin protección activa';
}

function ticketResource(value: string | undefined): TicketPaymentResource | undefined {
    if (['coin', 'coins', 'moneda', 'monedas'].includes(value ?? '')) return 'coins';
    if (['limite', 'limites', 'diamante', 'diamantes'].includes(value ?? '')) return 'limite';
    return undefined;
}

export default defineSdkPlugin({
    help: ['store', 'store --info', 'store security', 'store buy security', 'store buy ticket <cantidad> [coins|limite]'],
    tags: ['store'],
    feature: 'store',
    command: [...STORE_COMMANDS],
    register: true,
    async execute(m, context) {
        const {args, usedPrefix, sdk} = context;
        const values = args.map(value => value.toLowerCase());
        if (!values.length) return sdk.reply.message('store.menu', {prefix: usedPrefix});
        if (values.includes('--info') || values[0] === 'info') return sdk.reply.message('store.guide', {prefix: usedPrefix});

        const isBuy = ['buy', 'comprar', 'compra'].includes(values[0] ?? '');
        const item = isBuy ? values[1] : values[0];
        if (['security', 'seguridad'].includes(item ?? '') && !isBuy) {
            const overview = await getSecurityOverview(m.sender);
            const previews = getSecurityPreviewLevels(overview.level).map(level => sdk.content.renderMessage('store.securityPreview', {
                level,
                protection: Math.round((1 - getSecurityRemainingFactor(level)) * 100),
                price: getSecurityDailyPrice(level),
            })).join('\n') || '• Seguridad al nivel máximo.';
            const active = overview.subscription && overview.subscription.paidUntil > new Date();
            return sdk.reply.message('store.security', {
                level: overview.level,
                status: active ? overview.subscription?.status ?? 'inactive' : 'inactive',
                tier: active ? overview.subscription?.tier ?? 0 : 0,
                price: overview.subscription?.dailyPriceCoins ?? getSecurityDailyPrice(overview.level),
                paidUntil: dateLabel(active ? overview.subscription?.paidUntil : undefined),
                previews,
                prefix: usedPrefix,
            });
        }
        if (isBuy && ['security', 'seguridad'].includes(item ?? '')) {
            const result = await buySecurity(m.sender);
            if (result.kind === 'level_too_low') return sdk.reply.message('store.levelTooLow', {prefix: usedPrefix});
            if (result.kind === 'insufficient_coins') return sdk.reply.message('store.insufficientCoins');
            if (result.kind !== 'success') return sdk.reply.message('rpg.shared.missingUser');
            const receipt = sdk.content.renderMessage('store.securityReceipt', {
                tier: result.subscription.tier,
                price: result.subscription.dailyPriceCoins,
                paidUntil: dateLabel(result.subscription.paidUntil),
                balance: result.walletCoins,
                prefix: usedPrefix,
            });
            return deliverPrivateReceipt(m, context, receipt);
        }
        if (isBuy && ['ticket', 'tickets', 'rifa', 'raffle', 'boleto', 'boletos'].includes(item ?? '')) {
            const quantity = args[2] === undefined ? 1 : Number(args[2]);
            const requestedResource = ticketResource(values[3]);
            if (values[3] && !requestedResource) return sdk.reply.message('store.ticketInvalid');
            const result = await buyRaffleTickets({userId: m.sender, quantity, paymentResource: requestedResource});
            if (result.kind === 'invalid_quantity') return sdk.reply.message('store.ticketInvalid');
            if (result.kind === 'insufficient_funds') return sdk.reply.message('store.ticketFunds');
            if (result.kind !== 'success') return sdk.reply.message('rpg.shared.missingUser');
            const receipt = sdk.content.renderMessage('store.ticketReceipt', {
                quantity: result.quantity,
                total: result.total,
                resource: result.paymentResource === 'coins' ? 'Coins' : 'Límites',
                codes: result.codes.map(code => `• \`${code}\``).join('\n'),
            });
            return deliverPrivateReceipt(m, context, receipt);
        }
        return sdk.reply.message('store.guide', {prefix: usedPrefix});
    },
});
