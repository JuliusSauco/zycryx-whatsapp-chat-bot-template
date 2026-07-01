import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {divorceUsers, getUserById} from '../../services/user.service.js'

export default defineSdkPlugin({
    help: ['divorce <@tag>'],
    tags: ['econ'],
    command: ['divorce'],
    register: true,
    async execute(m, {conn, args, sdk}) {
    const targetId = m.mentionedJid[0] || args[0]
    if (!targetId) return sdk.reply.message('rpg.marriage.divorceMissingTarget')

    const user = await getUserById(m.sender)
    if (!user || !user.marry || user.marry !== targetId) return sdk.reply.message('rpg.marriage.divorceNotMarried')

    await divorceUsers(m.sender, targetId)
    const nombre1 = await conn.getName(m.sender)
    const nombre2 = await conn.getName(targetId)
    return conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.divorceSuccess', {
        user: m.sender.split('@')[0],
        userName: nombre1,
        target: targetId.split('@')[0],
        targetName: nombre2
    }), m, {mentions: [m.sender, targetId]})
    }
})

