import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage} from '../../lib/message-template.js'

export default definePlugin({
    help: ["leave"],
    tags: ["owner"],
    command: /^(salir|leavegc|salirdelgrupo|leave)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, text}) {
        let id = text ? text : m.chat
        await conn.reply(id, getRequiredPluginMessage('owner.leave.notice'))
        await conn.groupLeave(id)
    }
})
