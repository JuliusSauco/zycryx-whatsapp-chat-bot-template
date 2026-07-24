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

export default defineSdkPlugin({
    help: ['marry @tag'],
    tags: ['econ'],
    command: ['marry', 'pareja'],
    register: true,
    async before(m, {conn}) {
    const req = await getMarriageRequest(m.sender)
    if (!req) return

    const response = m.originalText.toLowerCase()
    if (response === 'aceptar') {
        await marryUsers(m.sender, req)
        await conn.reply(m.chat, content.renderMessage('rpg.marriage.accepted', {
            requester: req.split('@')[0],
            recipient: m.sender.split('@')[0]
        }), m, {mentions: [req, m.sender]})
    } else if (response === 'rechazar') {
        await setMarriageRequest(m.sender, null)
        await conn.reply(m.chat, content.renderMessage('rpg.marriage.rejected', {
            requester: req.split('@')[0]
        }), m, {mentions: [req]})
    }

    },
    async execute(m, {conn, sdk}) {
    const user = await getUserById(m.sender)
    if (!user) return sdk.reply.message('rpg.shared.missingUserInDb')

    if (user.marry) {
        const spouseName = await getUserName(user.marry) || sdk.content.message('rpg.shared.unnamed')
        if (user.marry === (m.mentionedJid[0] || '')) return conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.alreadyMarriedSame', {
            spouse: user.marry.split('@')[0]
        }), m, {mentions: [user.marry]})
        return conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.alreadyMarried', {
            spouse: user.marry.split('@')[0],
            spouseName
        }), m, {mentions: [user.marry]})
    }

    const mentionedUser = m.mentionedJid[0]
    if (!mentionedUser) return sdk.reply.message('rpg.marriage.missingMention')
    if (mentionedUser === m.sender) return sdk.reply.message('rpg.marriage.selfMarriage')

    const check = await getUserById(mentionedUser)
    if (!check) return sdk.reply.message('rpg.marriage.targetMissing')
    if (check.marry) return sdk.reply.message('rpg.marriage.targetMarried')

    await setMarriageRequest(mentionedUser, m.sender)
    await conn.reply(m.chat, sdk.content.renderMessage('rpg.marriage.proposal', {
        requester: m.sender.split('@')[0],
        recipient: mentionedUser.split('@')[0]
    }), m, {mentions: [m.sender, mentionedUser]})

    setTimeout(async () => {
        const again = await getMarriageRequest(mentionedUser)
        if (again) {
            await setMarriageRequest(mentionedUser, null)
            await conn.reply(m.chat, sdk.content.message('rpg.marriage.expired'), m)
        }
    }, 60000)
    }
})


