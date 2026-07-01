import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ["leave"],
    tags: ["owner"],
    command: /^(salir|leavegc|salirdelgrupo|leave)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, text, sdk}) {
        let id = text ? text : m.chat
        await conn.reply(id, sdk.content.message('owner.leave.notice'))
        await conn.groupLeave(id)
    }
})
