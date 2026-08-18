import {defineSdkPlugin} from '../../core/plugin-sdk.js';
//Código elaborado por: https://github.com/elrebelde21
import {
    getMarriageRequest,
    getUserById,
    getUserName,
    marryUsers,
    setMarriageRequest,
} from '../../services/user.service.js'
import {content} from '../../services/content.service.js';
import {resolveStoredUserMention} from '../../services/profile-user.service.js';
import {getParticipantsFast} from '../../utils/mention.js';

export default defineSdkPlugin({
    help: ['marry @tag'],
    tags: ['rpg'],
    command: ['marry', 'pareja'],
    register: true,
    async before(m, {conn, participants}) {
    const req = await getMarriageRequest(m.sender)
    if (!req) return

    const response = m.originalText.toLowerCase()
    const groupParticipants = getParticipantsFast(conn, m.chat, participants)
    const requester = await resolveStoredUserMention(req, groupParticipants)
    const recipient = await resolveStoredUserMention(m.sender, groupParticipants)
    if (response === 'aceptar') {
        await marryUsers(m.sender, req)
        await conn.reply(m.chat, content.renderMessage('rpg.marriage.accepted', {
            requester: mentionLabel(requester.tag),
            recipient: mentionLabel(recipient.tag)
        }), m, {mentions: uniqueMentions(requester.mentionJid, recipient.mentionJid)})
    } else if (response === 'rechazar') {
        await setMarriageRequest(m.sender, null)
        await conn.reply(m.chat, content.renderMessage('rpg.marriage.rejected', {
            requester: mentionLabel(requester.tag)
        }), m, {mentions: uniqueMentions(requester.mentionJid)})
    }

    },
    async execute(m, {conn, sdk, participants}) {
    const user = await getUserById(m.sender)
    if (!user) return sdk.reply.message('rpg.shared.missingUserInDb')
    const groupParticipants = getParticipantsFast(conn, m.chat, participants)

    if (user.marry) {
        const spouseName = await getUserName(user.marry) || sdk.content.message('rpg.shared.unnamed')
        const spouse = await resolveStoredUserMention(user.marry, groupParticipants)
        if (user.marry === (m.mentionedJid[0] || '')) return conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.alreadyMarriedSame', {
            spouse: mentionLabel(spouse.tag)
        }), m, {mentions: uniqueMentions(spouse.mentionJid)})
        return conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.alreadyMarried', {
            spouse: mentionLabel(spouse.tag),
            spouseName
        }), m, {mentions: uniqueMentions(spouse.mentionJid)})
    }

    const mentionedUser = m.mentionedJid[0]
    if (!mentionedUser) return sdk.reply.message('rpg.marriage.missingMention')
    if (mentionedUser === m.sender) return sdk.reply.message('rpg.marriage.selfMarriage')

    const check = await getUserById(mentionedUser)
    if (!check) return sdk.reply.message('rpg.marriage.targetMissing')
    if (check.marry) return sdk.reply.message('rpg.marriage.targetMarried')

    await setMarriageRequest(mentionedUser, m.sender)
    const requester = await resolveStoredUserMention(m.sender, groupParticipants)
    const recipient = await resolveStoredUserMention(mentionedUser, groupParticipants)
    await conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.proposal', {
        requester: mentionLabel(requester.tag),
        recipient: mentionLabel(recipient.tag)
    }), m, {mentions: uniqueMentions(requester.mentionJid, recipient.mentionJid)})

    setTimeout(async () => {
        const again = await getMarriageRequest(mentionedUser)
        if (again) {
            await setMarriageRequest(mentionedUser, null)
            await conn.reply(m.chat, sdk.content.message('rpg.marriage.expired'), m)
        }
    }, 60000)
    }
})

function mentionLabel(tag: string): string {
    return tag.replace(/^@/, '')
}

function uniqueMentions(...jids: Array<string | null | undefined>): string[] {
    return [...new Set(jids.filter((jid): jid is string => !!jid))]
}


