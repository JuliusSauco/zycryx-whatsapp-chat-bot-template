import {defineSdkPlugin} from '../../core/sdk-plugin.js'
//import Presence from '@adiwajshing/baileys'
export default defineSdkPlugin({
    help: ['setname'],
    tags: ['group'],
    command: /^(setname|newnombre|nuevonombre)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {sdk}) {
    if (!sdk.text) throw sdk.content.message('group.setName.missing')
    try {
        let text = sdk.args.join(' ')
        if (!sdk.args || !sdk.args[0]) {
        } else {
            sdk.conn.groupUpdateSubject(sdk.chatId, text)
        }
        await sdk.reply.react("✅️")
    } catch (e: unknown) {
        throw sdk.content.message('group.setName.error')
    }
    }
})
