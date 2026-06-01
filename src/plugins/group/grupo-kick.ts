import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    command: ['kick', 'expulsar'],
    help: ['kick *@user*'],
    tags: ['group'],
    admin: true,
    group: true,
    botAdmin: true,
    register: true,
    async execute(m, {conn}) {
        const kickte = `A quien eliminó? etiquetas a una persona con @tag pendejo`;
        if (!m.mentionedJid[0] && !m.quoted) return m.reply(kickte, m.chat, {mentions: conn.parseMention(kickte)});
        const user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted?.sender;
        if (!user) return m.reply(kickte, m.chat, {mentions: await conn.parseMention(kickte)});
        await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
    }
});
