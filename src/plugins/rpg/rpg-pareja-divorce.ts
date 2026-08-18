import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {divorceUsers, getUserById} from '../../services/user.service.js'
import {resolveStoredUserMention} from '../../services/profile-user.service.js';
import {getParticipantsFast} from '../../utils/mention.js';

export default defineSdkPlugin({
    help: ['divorce <@tag>'],
    tags: ['rpg'],
    command: ['divorce'],
    register: true,
    async execute(m, {conn, args, sdk, participants}) {
    const targetId = m.mentionedJid[0] || args[0]
    if (!targetId) return sdk.reply.message('rpg.marriage.divorceMissingTarget')

    const user = await getUserById(m.sender)
    if (!user || !user.marry || user.marry !== targetId) return sdk.reply.message('rpg.marriage.divorceNotMarried')

    await divorceUsers(m.sender, targetId)
    const nombre1 = await conn.getName(m.sender)
    const nombre2 = await conn.getName(targetId)
    const groupParticipants = getParticipantsFast(conn, m.chat, participants)
    const senderMention = await resolveStoredUserMention(m.sender, groupParticipants)
    const targetMention = await resolveStoredUserMention(targetId, groupParticipants)
    return conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.divorceSuccess', {
        user: senderMention.tag.replace(/^@/, ''),
        userName: nombre1,
        target: targetMention.tag.replace(/^@/, ''),
        targetName: nombre2
    }), m, {mentions: [...new Set([senderMention.mentionJid, targetMention.mentionJid])]})
    }
})

