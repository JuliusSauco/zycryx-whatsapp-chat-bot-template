import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    command: ['kick', 'expulsar'],
    help: ['kick *@user*'],
    tags: ['group'],
    admin: true,
    group: true,
    botAdmin: true,
    register: true,
    async execute(m, {sdk}) {
        const kickte = sdk.content.message('group.kick.missingUser');
        if (!m.mentionedJid[0] && !m.quoted) return sdk.reply.text(kickte, null, {mentions: await sdk.conn.parseMention(kickte)});
        const user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted?.sender;
        if (!user) return sdk.reply.text(kickte, null, {mentions: await sdk.conn.parseMention(kickte)});
        await sdk.conn.groupParticipantsUpdate(sdk.chatId, [user], 'remove');
    }
});
