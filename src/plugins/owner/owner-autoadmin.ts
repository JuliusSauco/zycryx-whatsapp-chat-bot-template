import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['autoadmin'],
    tags: ['owner'],
    command: /^admin.|atad|autoadmin$/i,
    owner: true,
    botAdmin: true,
    async execute(m, {conn, isAdmin, sdk}) {
        if (m.fromMe) throw 'Nggk'
        if (isAdmin) return sdk.reply.message('owner.autoAdmin.alreadyAdmin')
        await conn.groupParticipantsUpdate(m.chat, [m.sender], "promote")
    }
})
