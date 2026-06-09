import {definePlugin} from '../../core/define-plugin.js'
import {canLevelUp, xpRange} from '../../lib/levelling.js'
import {getRole} from '../hooks/_autolevelup.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'
import {httpBuffer} from '../../lib/http-client.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

const multiplier = 650

export default definePlugin({
    help: ['nivel', 'levelup'],
    tags: ['econ'],
    command: ['nivel', 'lvl', 'levelup', 'level'],
    register: true,
    async execute(m, {conn}) {
    const name = m.pushName || m.sender.split('@')[0]
    let user = await getWallet(m.sender)
    if (!user) return m.reply(getRequiredPluginMessage('rpg.shared.missingUser'))
    const {exp, level, role, money} = user

    if (!canLevelUp(level, exp, multiplier)) {
        const {min, xp, max} = xpRange(level, multiplier)
        return m.reply(renderTemplate(getRequiredPluginMessage('rpg.level.stats'), {
            name,
            xpProgress: exp - min,
            xpRequired: xp,
            level,
            role,
            missingXp: max - exp
        }))
    }

    const before = level
    let newLevel = level
    while (canLevelUp(newLevel, exp, multiplier)) newLevel++
    const newRole = getRole(newLevel).name
    await setUserLevelRole(m.sender, newLevel, newRole)

    const str = renderTemplate(getRequiredPluginMessage('rpg.level.up'), {
        before,
        after: newLevel,
        role: newRole
    })

    try {
        const apiURL = `${info.apis}/canvas/balcard?url=${encodeURIComponent(m.pp)}&background=https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg&username=${encodeURIComponent(name)}&discriminator=${m.sender.replace(/[^0-9]/g, '')}&money=${money}&xp=${exp}&level=${newLevel}`
        const buffer = await httpBuffer(apiURL)
        await conn.sendFile(m.chat, buffer, 'levelup.jpg', str, m)
    } catch (e: unknown) {
        await conn.fakeReply(m.chat, str, '13135550002@s.whatsapp.net', getRequiredPluginMessage('rpg.level.quoted'), 'status@broadcast')
    }
    }
})

