import {definePlugin} from '../../core/define-plugin.js'
export default definePlugin({
    help: ['resetlink'],
    tags: ['group'],
    command: ['resetlink', 'revoke'],
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn}) {
    const revoke = await conn.groupRevokeInvite(m.chat);
    await conn.reply(m.chat, `*_Se restableció con éxito el link del grupo._*\n*• Link Nuevo:* ${'https://chat.whatsapp.com/' + revoke}`, m);
    }
});
;
