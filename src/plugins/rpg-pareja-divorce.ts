import {definePlugin} from '../core/define-plugin.js'
import {divorceUsers, getUserById} from '../services/user.service.js'

export default definePlugin({
    help: ['divorce <@tag>'],
    tags: ['econ'],
    command: ['divorce'],
    register: true,
    async execute(m, {conn, args}) {
    const targetId = m.mentionedJid[0] || args[0]
    if (!targetId) return m.reply("⚠️ Debes etiquetar a la persona con la que deseas divorciarte.")

    const user = await getUserById(m.sender)
    if (!user || !user.marry || user.marry !== targetId) return m.reply("⚠️ No estás casado con esta persona para poder divorciarte.")

    await divorceUsers(m.sender, targetId)
    const nombre1 = await conn.getName(m.sender)
    const nombre2 = await conn.getName(targetId)
    return conn.reply(m.chat, `@${m.sender.split('@')[0]} (${nombre1}) se divorció de @${targetId.split('@')[0]} (${nombre2}) ahora están separados 🫣`, m, {mentions: [m.sender, targetId]})
    }
})

