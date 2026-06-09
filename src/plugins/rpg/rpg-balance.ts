import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {getWallet} from '../../services/wallet.service.js';

export default definePlugin({
    help: ['balance'],
    tags: ['econ'],
    command: ['bal', 'diamantes', 'diamond', 'balance'],
    register: true,
    async execute(m, {conn, usedPrefix}) {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user?.id || m.sender : m.sender);
    const user = await getWallet(who);
    if (!user) throw getRequiredPluginMessage('rpg.shared.missingUser');

    await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.balance.response'), {
        user: who.split('@')[0],
        diamonds: user.limite,
        exp: user.exp,
        money: user.money,
        bank: user.banco,
        prefix: usedPrefix
    }), m, {mentions: [who]});
    }
});

;
