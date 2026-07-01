import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {getWallet} from '../../services/wallet.service.js';

export default defineSdkPlugin({
    help: ['balance'],
    tags: ['econ'],
    command: ['bal', 'diamantes', 'diamond', 'balance'],
    register: true,
    async execute(m, {conn, usedPrefix, sdk}) {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user?.id || m.sender : m.sender);
    const user = await getWallet(who);
    if (!user) return sdk.reply.message('rpg.shared.missingUser');

    await sdk.reply.message('rpg.balance.response', {
        user: who.split('@')[0],
        diamonds: user.limite,
        exp: user.exp,
        money: user.money,
        bank: user.banco,
        prefix: usedPrefix
    }, null, {mentions: [who]});
    }
});

;
