import {defineSdkPlugin} from '../../core/sdk-plugin.js'
export default defineSdkPlugin({
    help: ['linkgroup'],
    tags: ['group'],
    command: /^link(gro?up)?$/i,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    const code = await sdk.conn.groupInviteCode(sdk.chatId).catch(() => null)
    if (!code) return sdk.reply.failure(sdk.content.message('group.link.failure'))
    return sdk.reply.text('https://chat.whatsapp.com/' + code)
    }
});
;
