import {definePlugin} from '../../core/define-plugin.js'
export default definePlugin({
    help: ['setdesc'],
    tags: ['group'],
    command: /^setdesk|setdesc|newdesc|descripción|descripcion$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {conn, args}) {
    await conn.groupUpdateDescription(m.chat, `${args.join(" ")}`);
    m.react("✅️")
    }
})
