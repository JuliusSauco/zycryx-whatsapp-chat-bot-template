import {definePlugin} from '../../core/define-plugin.js'
import {canLevelUp, xpRange} from '../../lib/levelling.js'
import {getRole} from '../hooks/_autolevelup.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'
import {httpBuffer} from '../../lib/http-client.js'

const multiplier = 650

export default definePlugin({
    help: ['nivel', 'levelup'],
    tags: ['econ'],
    command: ['nivel', 'lvl', 'levelup', 'level'],
    register: true,
    async execute(m, {conn}) {
    const name = m.pushName || m.sender.split('@')[0]
    let user = await getWallet(m.sender)
    if (!user) return m.reply('✳️ El usuario no se encuentra en la base de datos.')
    const {exp, level, role, money} = user

    if (!canLevelUp(level, exp, multiplier)) {
        const {min, xp, max} = xpRange(level, multiplier)
        return m.reply(`『 *TUS ESTADISTICAS 🆙* 』

Tus estadisticas en tiempo real 🕐

├─ ❏ *NOMBRE:*  ${name}
├─ ❏ *XP 🆙:* ${exp - min}/${xp}
├─ ❏ *NIVEL:* ${level}
└─ ❏ *RANGO:* ${role}

> Te falta *${max - exp}* De *XP* para subir de nivel`)
    }

    const before = level
    let newLevel = level
    while (canLevelUp(newLevel, exp, multiplier)) newLevel++
    const newRole = getRole(newLevel).name
    await setUserLevelRole(m.sender, newLevel, newRole)

    const str = `*[ 𝐋𝐄𝐕𝐄𝐋 𝐔𝐏 ]*
        
*• 𝐍𝐢𝐯𝐞𝐥 𝐚𝐧𝐭𝐞𝐫𝐢𝐨𝐫:* ${before}
*• 𝐍𝐢𝐯𝐞𝐥 𝐚𝐜𝐭𝐮𝐚𝐥:* ${newLevel}
*• 𝐑𝐚𝐧𝐠𝐨:* ${newRole}

> _*Cuanto más interactúes con los bots, mayor será tu nivel*_`

    try {
        const apiURL = `${info.apis}/canvas/balcard?url=${encodeURIComponent(m.pp)}&background=https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg&username=${encodeURIComponent(name)}&discriminator=${m.sender.replace(/[^0-9]/g, '')}&money=${money}&xp=${exp}&level=${newLevel}`
        const buffer = await httpBuffer(apiURL)
        await conn.sendFile(m.chat, buffer, 'levelup.jpg', str, m)
    } catch (e: unknown) {
        await conn.fakeReply(m.chat, str, '13135550002@s.whatsapp.net', `*TUS ESTADISTICAS 🆙*`, 'status@broadcast')
    }
    }
})

