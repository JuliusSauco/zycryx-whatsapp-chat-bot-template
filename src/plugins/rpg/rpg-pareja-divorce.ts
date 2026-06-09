import {definePlugin} from '../../core/define-plugin.js'
import {divorceUsers, getUserById} from '../../services/user.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

export default definePlugin({
    help: ['divorce <@tag>'],
    tags: ['econ'],
    command: ['divorce'],
    register: true,
    async execute(m, {conn, args}) {
    const targetId = m.mentionedJid[0] || args[0]
    if (!targetId) return m.reply(getRequiredPluginMessage('rpg.marriage.divorceMissingTarget'))

    const user = await getUserById(m.sender)
    if (!user || !user.marry || user.marry !== targetId) return m.reply(getRequiredPluginMessage('rpg.marriage.divorceNotMarried'))

    await divorceUsers(m.sender, targetId)
    const nombre1 = await conn.getName(m.sender)
    const nombre2 = await conn.getName(targetId)
    return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.marriage.divorceSuccess'), {
        user: m.sender.split('@')[0],
        userName: nombre1,
        target: targetId.split('@')[0],
        targetName: nombre2
    }), m, {mentions: [m.sender, targetId]})
    }
})

