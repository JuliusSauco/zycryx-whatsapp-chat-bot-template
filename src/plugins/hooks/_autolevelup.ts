import {canLevelUp} from '../../lib/levelling.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'
import type {BeforePluginContext} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'
import {pickRandom} from '../../utils/random.js'

const multiplier = 650

export async function before(m: BotMessage, {conn, groupSettings, isGroup}: BeforePluginContext) {
    if (!isGroup || !groupSettings?.autolevelup) return
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
    const ranks = ['NOVATO(A)', 'APRENDIS', 'EXPLORADOR(A)', 'MAESTRO(A)', 'IRON', 'PLATA', 'ORO', 'LEYENDA', 'ESTELAR', 'DIAMANTE', 'TOP ASTRAL', 'ÉLITE GLOBAL']
    const subLevels = ['V', 'IV', 'III', 'II', 'I']
    const roles = []

    let lvl = 0
    for (let rank of ranks) {
        for (let sub of subLevels) {
            roles.push({level: lvl, name: `${rank} ${sub}`})
            lvl++
        }
    }

    return roles.reverse().find(r => level >= r.level) || {level, name: 'NOVATO(A) V'}
}
