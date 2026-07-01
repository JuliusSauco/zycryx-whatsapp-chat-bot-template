import {defineSdkPlugin} from '../../core/sdk-plugin.js'
export default defineSdkPlugin({
    help: ['setdesc'],
    tags: ['group'],
    command: /^setdesk|setdesc|newdesc|descripción|descripcion$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {sdk}) {
    await sdk.conn.groupUpdateDescription(sdk.chatId, `${sdk.args.join(" ")}`);
    await sdk.reply.react("✅️")
    }
})
