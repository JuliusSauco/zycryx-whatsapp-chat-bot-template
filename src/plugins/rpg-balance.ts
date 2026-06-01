import {definePlugin} from '../core/define-plugin.js'
import {getWallet} from '../services/wallet.service.js';

export default definePlugin({
    help: ['balance'],
    tags: ['econ'],
    command: ['bal', 'diamantes', 'diamond', 'balance'],
    register: true,
    async execute(m, {conn, usedPrefix}) {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user?.id || m.sender : m.sender);
    const user = await getWallet(who);
    if (!user) throw '✳️ El usuario no se encuentra en la base de datos.';

    await conn.reply(m.chat, `*•───⧼⧼⧼ 𝙱𝙰𝙻𝙰𝙽𝙲𝙴 ⧽⧽⧽───•*

@${who.split('@')[0]} Tiene:

*• 𝐃𝐢𝐚𝐦𝐚𝐧𝐭𝐞:* _${user.limite} 💎_
*• 𝐄𝐱𝐩:* _${user.exp} ⬆️_
*• 𝐋𝐨𝐥𝐢𝐂𝐨𝐢𝐧𝐬:* _${user.money} 🪙_
> Afuera del Banco 

*•───⧼⧼⧼ 𝙱𝙰𝙽𝙲𝙾 ⧽⧽⧽───•*

*🏦 𝐃𝐢𝐧𝐞𝐫𝐨 :* _${user.banco} 💎_
> Adentro del Banco 🏦 

•───────────────•

> *𝐍𝐎𝐓𝐀 :* 
> 𝐩𝐮𝐞𝐝𝐞𝐬 𝐜𝐨𝐦𝐩𝐫𝐚𝐫 💎 𝐝𝐢𝐚𝐦𝐚𝐧𝐭𝐞 𝐮𝐬𝐚𝐧𝐝𝐨 𝐥𝐨𝐬 𝐜𝐨𝐦𝐚𝐧𝐝𝐨𝐬
> *• ${usedPrefix}buy <cantidad>*
> *• ${usedPrefix}buyall*`, m, {mentions: [who]});
    }
});

;
