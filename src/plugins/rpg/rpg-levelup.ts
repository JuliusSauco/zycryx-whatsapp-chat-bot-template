import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {canLevelUp, xpRange} from '../../lib/levelling.js'
import {getRole} from '../hooks/_autolevelup.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'

const multiplier = 650

export default defineSdkPlugin({
    help: ['nivel', 'levelup'],
    tags: ['rpg'],
    command: ['nivel', 'lvl', 'levelup', 'level'],
    register: true,
    async execute(m, {conn, sdk}) {
    const name = m.pushName || m.sender.split('@')[0]
    let user = await getWallet(m.sender)
    if (!user) return sdk.reply.message('rpg.shared.missingUser')
    const {exp, level, role, coins} = user

    if (!canLevelUp(level, exp, multiplier)) {
        const {min, xp, max} = xpRange(level, multiplier)
        return sdk.reply.message('rpg.level.stats', {
            name,
            xpProgress: exp - min,
            xpRequired: xp,
            level,
            role,
            missingXp: max - exp
        })
    }

    const before = level
    let newLevel = level
    while (canLevelUp(newLevel, exp, multiplier)) newLevel++
    const newRole = getRole(newLevel).name
    await setUserLevelRole(m.sender, newLevel, newRole)

    const str = sdk.content.renderMessage('rpg.level.up', {
        before,
        after: newLevel,
        role: newRole
    })

    try {
        const apiURL = `${info.apis}/canvas/balcard?url=${encodeURIComponent(m.pp)}&background=https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg&username=${encodeURIComponent(name)}&discriminator=${m.sender.replace(/[^0-9]/g, '')}&money=${coins}&xp=${exp}&level=${newLevel}`
        const buffer = await sdk.http.buffer(apiURL)
        await conn.sendFile(m.chat, buffer, 'levelup.jpg', str, m)
    } catch (e: unknown) {
        await conn.fakeReply(m.chat, str, '13135550002@s.whatsapp.net', sdk.content.message('rpg.level.quoted'), 'status@broadcast')
    }
    }
})

