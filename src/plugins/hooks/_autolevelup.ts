import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {canLevelUp} from '../../lib/levelling.js'
import {getGroupSettings} from '../../services/group-settings.service.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'
import type {ExtendedConn} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'

const multiplier = 650

export async function before(m: BotMessage, {conn}: {conn: ExtendedConn}) {
    const chat = await getGroupSettings(m.chat)
    if (!chat?.autolevelup) return
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
        conn.reply(m.chat, [`*「 FELICIDADES LEVEL UP 🆙🥳 」*\n\nFelicidades subiste de nivel sigue asi 👏\n\n*• NIVEL:* ${before} ⟿ ${user.level}\n*• RANGO:* ${user.role}\n\n_*Para ver tu XP en tiempo real coloca el comando #level*_`, `${senderMention} Ohhh pa has alcanzado el siguiente nivel\n*• NIVEL:* ${before} ⟿ ${user.level}\n\n_*Para ver quien es esta el top coloca el comando #lb*_`, `Que pro ${senderMention} has alcanzado un nuevo nivel 🙌\n\n*• Nuevo nivel:* ${user.level}\n*• Nivel anterior:* ${before}\n`].getRandom(), m, {
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

        let niv = `*${m.pushName || 'Anónimo'}* Obtiene un nuevo nivel 🥳

*• Nivel anterior:* ${before} 
*• Nivel actúal :* ${user.level}
*• Rol:* ${user.role}
*• Bot:* ${info.wm}`
        let nivell = `*${m.pushName || 'Anónimo'} Haz subido un nuevo nivel 🥳*

> _*• NIVEL:* ${before} ⟿ ${user.level}_`
        let nivelll = `🥳 ${m.pushName || 'Anónimo'} Que pro Acaba de alcanzar un nuevo nivel 🥳

*• Nivel:* ${before} ⟿ ${user.level}
*• Rango:* ${user.role}
*• Bot:* ${info.wm}`
        /*await global.conn.sendMessage("120363297379773397@newsletter", { text: [niv, nivell, nivelll].getRandom(), contextInfo: {
        externalAdReply: {
        title: "【 🔔 Notificación General 🔔 】",
        body: '¡Haz subido de nivel 🥳!',
        thumbnailUrl: m.pp,
        sourceUrl: info.nna,
        mediaType: 1,
        showAdAttribution: false,
        renderLargerThumbnail: false
        }}}, { quoted: null }).catch(err => logError(err))*/
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
