import {definePlugin} from '../../core/define-plugin.js'
//import Presence from '@adiwajshing/baileys'
//let Presence = (await import(global.baileys)).default
export default definePlugin({
    help: ['setname'],
    tags: ['group'],
    command: /^(setname|newnombre|nuevonombre)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {conn, args, text}) {
    if (!text) throw "⚠️ Ingresar el texto para el grupo"
    try {
        let text = args.join(' ')
        if (!args || !args[0]) {
        } else {
            conn.groupUpdateSubject(m.chat, text)
        }
        m.react("✅️")
    } catch (e: unknown) {
        throw "error"
    }
    }
})
