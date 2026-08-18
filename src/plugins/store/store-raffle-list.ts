import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {listAvailableRaffleTickets} from '../../services/store.service.js';

export default defineSdkPlugin({
    help: ['listrifas1', 'listrifas2', 'listraffles1'],
    tags: ['store', 'owner'],
    feature: 'store',
    command: /^(listrifas|listraffles|rafflelist)\d*$/i,
    register: true,
    owner: true,
    private: true,
    async execute(_m, {command, sdk}) {
        const suffix = command.match(/(\d+)$/)?.[1];
        const page = suffix ? Number(suffix) : 1;
        if (!Number.isSafeInteger(page) || page < 1) return sdk.reply.message('store.raffleInvalidPage');
        const result = await listAvailableRaffleTickets(page);
        if (!result.totalItems) return sdk.reply.message('store.raffleListEmpty');
        if (!result.items.length || page > result.totalPages) return sdk.reply.message('store.raffleInvalidPage');
        const mentions = result.items.map(item => item.buyerId);
        const rows = result.items.map(item => sdk.content.renderMessage('store.raffleListItem', {
            user: item.buyerId.split('@')[0], quantity: item.quantity,
        })).join('\n');
        return sdk.reply.text(sdk.content.renderMessage('store.raffleList', {
            rows, total: result.totalItems, page: result.page, pages: result.totalPages,
        }), null, {mentions});
    },
});
