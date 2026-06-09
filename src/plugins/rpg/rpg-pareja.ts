import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21
import {
    getMarriageRequest,
    getUserById,
    getUserName,
    marryUsers,
    setMarriageRequest,
} from '../../services/user.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

export default definePlugin({
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
        await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.marriage.accepted'), {
            requester: req.split('@')[0],
            recipient: m.sender.split('@')[0]
        }), m, {mentions: [req, m.sender]})
    } else if (response === 'rechazar') {
        await setMarriageRequest(m.sender, null)
        await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.marriage.rejected'), {
            requester: req.split('@')[0]
        }), m, {mentions: [req]})
    }

    },
    async execute(m, {conn}) {
    const user = await getUserById(m.sender)
    if (!user) return m.reply(getRequiredPluginMessage('rpg.shared.missingUserInDb'))

    if (user.marry) {
        const spouseName = await getUserName(user.marry) || getRequiredPluginMessage('rpg.shared.unnamed')
        if (user.marry === (m.mentionedJid[0] || '')) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.marriage.alreadyMarriedSame'), {
            spouse: user.marry.split('@')[0]
        }), m, {mentions: [m.sender]})
        return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.marriage.alreadyMarried'), {
            spouse: user.marry.split('@')[0],
            spouseName
        }), m, {mentions: [m.sender]})
    }

    const mentionedUser = m.mentionedJid[0]
    if (!mentionedUser) return m.reply(getRequiredPluginMessage('rpg.marriage.missingMention'))
    if (mentionedUser === m.sender) return m.reply(getRequiredPluginMessage('rpg.marriage.selfMarriage'))

    const check = await getUserById(mentionedUser)
    if (!check) return m.reply(getRequiredPluginMessage('rpg.marriage.targetMissing'))
    if (check.marry) return m.reply(getRequiredPluginMessage('rpg.marriage.targetMarried'))

    await setMarriageRequest(mentionedUser, m.sender)
    await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.marriage.proposal'), {
        requester: m.sender.split('@')[0],
        recipient: mentionedUser.split('@')[0]
    }), m, {mentions: [m.sender, mentionedUser]})

    setTimeout(async () => {
        const again = await getMarriageRequest(mentionedUser)
        if (again) {
            await setMarriageRequest(mentionedUser, null)
            await conn.reply(m.chat, getRequiredPluginMessage('rpg.marriage.expired'), m)
        }
    }, 60000)
    }
})


