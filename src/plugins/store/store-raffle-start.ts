import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {drawRaffle} from '../../services/store.service.js';

export default defineSdkPlugin({
    help: ['start rifa <título>', 'star rifa <título>', 'iniciar rifa <título>'],
    tags: ['store', 'owner'],
    feature: 'store',
    command: /^(start|star|iniciar)$/i,
    register: true,
    owner: true,
    async execute(m, {args, usedPrefix, conn, sdk}) {
        if (!['rifa', 'raffle', 'sorteo'].includes(args[0]?.toLowerCase() ?? '')) {
            return sdk.reply.message('store.raffleInvalidTitle', {prefix: usedPrefix});
        }
        const result = await drawRaffle(args.slice(1).join(' '), m.sender);
        if (result.kind === 'invalid_title') return sdk.reply.message('store.raffleInvalidTitle', {prefix: usedPrefix});
        if (result.kind === 'empty') return sdk.reply.message('store.raffleEmpty');
        return conn.reply(m.chat, sdk.content.renderMessage('store.raffleWinner', {
            title: result.title.toUpperCase(), winner: result.winnerId.split('@')[0],
            code: result.ticketCode, total: result.totalEntries,
        }), m, {mentions: [result.winnerId]});
    },
});
