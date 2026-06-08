import {canLevelUp} from '../../lib/levelling.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'
import type {BeforePluginContext} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'
import {pickRandom} from '../../utils/random.js'

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

        const senderMention = `@${m.sender.split('@')[0]}`
        conn.reply(m.chat, pickRandom([`*「 FELICIDADES LEVEL UP 🆙🥳 」*\n\nFelicidades subiste de nivel sigue asi 👏\n\n*• NIVEL:* ${before} ⟿ ${user.level}\n*• RANGO:* ${user.role}\n\n_*Para ver tu XP en tiempo real coloca el comando #level*_`, `${senderMention} Ohhh pa has alcanzado el siguiente nivel\n*• NIVEL:* ${before} ⟿ ${user.level}\n\n_*Para ver quien es esta el top coloca el comando #lb*_`, `Que pro ${senderMention} has alcanzado un nuevo nivel 🙌\n\n*• Nuevo nivel:* ${user.level}\n*• Nivel anterior:* ${before}\n`]), m, {
            contextInfo: {
                externalAdReply: {
                    mediaType: 1,
                    title: info.wm,
                    body: ' 💫 𝐒𝐮𝐩𝐞𝐫 𝐁𝐨𝐭 𝐃𝐞 𝐖𝐡𝐚𝐭𝐬𝐚𝐩𝐩 🥳 ',
                    thumbnail: m.pp,
                    sourceUrl: info.md
                }
            }
        })
    }
}

export function getRole(level: number) {
    return roles.find(r => level >= r.level) || {level, name: 'NOVATO(A) V'}
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
