import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
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
    await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('group.resetLink.success'), {
        link: 'https://chat.whatsapp.com/' + revoke,
    }), m);
    }
});
;
