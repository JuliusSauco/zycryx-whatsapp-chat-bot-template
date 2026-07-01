import {defineSdkPlugin} from '../../core/sdk-plugin.js'
export default defineSdkPlugin({
    help: ['resetlink'],
    tags: ['group'],
    command: ['resetlink', 'revoke'],
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    const revoke = await sdk.conn.groupRevokeInvite(sdk.chatId);
    await sdk.reply.message('group.resetLink.success', {
        link: 'https://chat.whatsapp.com/' + revoke,
    });
    }
});
;
