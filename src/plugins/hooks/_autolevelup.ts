import {canLevelUp} from '../../lib/levelling.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'
import type {BeforePluginContext} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'
import {pickRandom} from '../../utils/random.js'
import {getRequiredPluginMessage, getRequiredPluginMessageList, renderTemplate} from '../../lib/message-template.js'

const multiplier = 650
const CHECK_INTERVAL_MS = 60_000
const lastLevelCheckByUser = new Map<string, number>()
const roles = buildRoles()

setInterval(() => {
    const expiresBefore = Date.now() - CHECK_INTERVAL_MS * 5
    for (const [userId, checkedAt] of lastLevelCheckByUser.entries()) {
        if (checkedAt < expiresBefore) lastLevelCheckByUser.delete(userId)
    }
}, CHECK_INTERVAL_MS * 5).unref?.()

export async function before(m: BotMessage, {conn, groupSettings, isGroup}: BeforePluginContext) {
    if (!isGroup || !groupSettings?.autolevelup) return
    if (!shouldCheckLevel(m.sender)) return

    const user = await getWallet(m.sender)
    if (!user) return

    const before = user.level
    let currentLevel = user.level
    while (canLevelUp(currentLevel, user.exp, multiplier)) {
        currentLevel++
    }

    if (currentLevel > before) {
        const newRole = getRole(currentLevel).name
        await setUserLevelRole(m.sender, currentLevel, newRole)
        user.level = currentLevel
        user.role = newRole

        const senderMention = m.sender.split('@')[0]
        const message = renderTemplate(pickRandom(getRequiredPluginMessageList('hooks.autoLevelUp.variants')), {
            user: senderMention,
            before,
            level: user.level,
            role: user.role
        })
        conn.reply(m.chat, message, m, {
            contextInfo: {
                externalAdReply: {
                    mediaType: 1,
                    title: info.wm,
                    body: getRequiredPluginMessage('hooks.autoLevelUp.adBody'),
                    thumbnail: m.pp,
                    sourceUrl: info.md
                }
            }
        })
    }
}

export function getRole(level: number) {
    return roles.find(r => level >= r.level) || {level, name: getRequiredPluginMessage('hooks.autoLevelUp.defaultRole')}
}

function shouldCheckLevel(userId: string): boolean {
    const now = Date.now()
    const lastCheck = lastLevelCheckByUser.get(userId) || 0
    if (now - lastCheck < CHECK_INTERVAL_MS) return false

    lastLevelCheckByUser.set(userId, now)
    return true
}

function buildRoles() {
    const ranks = ['NOVATO(A)', 'APRENDIS', 'EXPLORADOR(A)', 'MAESTRO(A)', 'IRON', 'PLATA', 'ORO', 'LEYENDA', 'ESTELAR', 'DIAMANTE', 'TOP ASTRAL', 'ÉLITE GLOBAL']
    const subLevels = ['V', 'IV', 'III', 'II', 'I']
    const builtRoles: Array<{level: number; name: string}> = []

    let lvl = 0
    for (let rank of ranks) {
        for (let sub of subLevels) {
            builtRoles.push({level: lvl, name: `${rank} ${sub}`})
            lvl++
        }
    }

    return builtRoles.reverse()
}
