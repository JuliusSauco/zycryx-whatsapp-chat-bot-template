import {logError} from '../../lib/logger.js';
import {getSubbotConfig} from '../../services/subbot.service.js'
import {setGroupExpiration} from '../../services/group-settings.service.js'
import {decrementUserLimit, getUserResources} from '../../services/user.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import {
    buildJoinedGroupGreeting,
    buildJoinRequestQueuedMessage,
    buildJoinUsageMessage,
    buildOwnerJoinRequestMessage,
} from './owner-join.messages.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i

export default definePlugin({
    help: ['join [chat.whatsapp.com] [tiempo]'],
    tags: ['owner'],
    command: /^unete|join|nuevogrupo|unir|unite|unirse|entra|entrar$/i,
    register: true,
    async execute(m, {conn, text, isOwner}) {
    const botId = conn.user?.id;
    if (!botId) return m.reply(getRequiredPluginMessage('owner.join.missingBotId'));
    let quotedText = m.quoted?.text || ""
    let extText = m.quoted?.message?.extendedTextMessage?.text || ""
    let allText = `${quotedText}\n${extText}\n${text}`
    let link = allText.match(linkRegex)?.[0]
    let code = link?.match(linkRegex)?.[1]

    if (!code) throw buildJoinUsageMessage();
    const groupLink = link || `chat.whatsapp.com/${code}`;

    let waMeMatch = allText.match(/wa\.me\/(\d{8,})/)
    let solicitante = waMeMatch ? waMeMatch[1] : m.sender.split('@')[0]
    const botConfig = await getSubbotConfig(botId)
    const prestar = botConfig.prestar === undefined ? true : botConfig.prestar
    const timeMatch = text.match(/(\d+)\s*(minuto|hora|día|dias|mes)/i)
    let time, unit
    if (!prestar && isOwner) {
        time = timeMatch ? parseInt(timeMatch[1]) : 1
        unit = timeMatch ? timeMatch[2].toLowerCase() : 'día'
    } else {
        time = timeMatch ? parseInt(timeMatch[1]) : 30
        unit = timeMatch ? timeMatch[2].toLowerCase() : 'minuto'
    }

    let timeInMs = 0
    if (unit.includes('minuto')) {
        timeInMs = time * 60 * 1000
    } else if (unit.includes('hora')) {
        timeInMs = time * 60 * 60 * 1000
    } else if (unit.includes('día') || unit.includes('dias')) {
        timeInMs = time * 24 * 60 * 60 * 1000
    } else if (unit.includes('mes')) {
        timeInMs = time * 30 * 24 * 60 * 60 * 1000
    }

    if (!prestar && !isOwner) {
        await m.reply(buildJoinRequestQueuedMessage())
        let ownerJid = "573226873710@s.whatsapp.net";
        if (ownerJid !== botId) {
            await conn.sendMessage(ownerJid, {
                text: buildOwnerJoinRequestMessage(m.sender, groupLink, time, unit),
                contextInfo: {mentionedJid: [m.sender]}
            });
        }
        return;
    }

    if (prestar || isOwner) {
        if (!isOwner) {
            const costPerHour = 100
            const cost = Math.ceil((timeInMs / (60 * 60 * 1000)) * costPerHour)
            const {limite} = await getUserResources(m.sender)
            if (limite < cost) return m.reply(renderTemplate(getRequiredPluginMessage('owner.join.notEnoughDiamonds'), {cost}))
            await decrementUserLimit(m.sender, cost)
            await m.reply(renderTemplate(getRequiredPluginMessage('owner.join.joining'), {cost}))
        }

        let res
        try {
            res = await conn.groupAcceptInvite(code)
        } catch (e: unknown) {
            logError("Error al unirse al grupo:", e)
            return m.reply(getRequiredPluginMessage('owner.join.joinFailed'))
        }
        if (!res) return m.reply(getRequiredPluginMessage('owner.join.joinFailed'))

        await new Promise(r => setTimeout(r, 3000))
        let mes = buildJoinedGroupGreeting(conn.user?.name || 'Bot', solicitante, time, unit)
        await conn.sendMessage(res, {text: mes, contextInfo: {mentionedJid: [`${solicitante}@s.whatsapp.net`]}})
        await setGroupExpiration(res, Date.now() + timeInMs)
        await m.reply(renderTemplate(getRequiredPluginMessage('owner.join.joined'), {
            time,
            unit,
            plural: time > 1 ? 's' : ''
        }))
    }
    }
})
