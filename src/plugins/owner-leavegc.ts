import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ["leave"],
    tags: ["owner"],
    command: /^(salir|leavegc|salirdelgrupo|leave)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, text}) {
        let id = text ? text : m.chat
        await conn.reply(id, '*𝐄𝐥 𝐁𝐨𝐭 𝐚𝐛𝐚𝐧𝐝𝐨𝐧𝐚 𝐞𝐥 𝐠𝐫𝐮𝐩𝐨, 𝐜𝐡𝐚𝐮 👋*')
        await conn.groupLeave(id)
    }
})
