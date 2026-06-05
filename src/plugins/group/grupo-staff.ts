import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
export default definePlugin({
    help: ['staff'],
    tags: ['group'],
    command: ['staff', 'admins', 'listadmin'],
    group: true,
    register: true,
    async execute(m, {conn, text, metadata}) {
    try {
        if (!text || !text.trim()) return m.reply(`😾 Y el texto?`)
        const admins = metadata.participants.filter(p => p.admin)
        if (!admins.length) return m.reply("⚠️ No hay administradores en este grupo.")

        const users = admins.map(p => p.phoneNumber || p.id)
        const total = users.length
        await m.react("📣")

        const mensaje = `•══✪〘 *ＳＴＡＦＦ* 〙✪══•

> *𝐒𝐞 𝐧𝐞𝐜𝐞𝐬𝐢𝐭𝐚 𝐥𝐚 𝐩𝐫𝐞𝐬𝐞𝐧𝐜𝐢𝐚 𝐝𝐞 𝐮𝐧 𝐚𝐝𝐦𝐢𝐧𝐬* 

*• Mensaje:* ${text.trim()}

👑 *Administradores (${total}):*\n` + users.map(u => `➥ @${u.replace(/@s\.whatsapp\.net|@lid/g, "").replace(/[^0-9]/g, "")}`).join(" \n ")

        await conn.sendMessage(m.chat, {
            text: mensaje + `\n\n> [ ⚠️ ️] *ᵁˢᵃʳ ᵉˢᵗᵉ ᶜᵒᵐᵃⁿᵈᵒ ˢᵒˡᵒ ᶜᵘᵃⁿᵈᵒ ˢᵉ ᵗʳᵃᵗᵉ ᵈᵉ ᵘⁿᵃ ᵉᵐᵉʳᵍᵉⁿᶜᶦᵃ*`,
            mentions: users
        }, {quoted: m})
    } catch (e: unknown) {
        logError("❌ Error en /admins:", e)
    }
    }
})

