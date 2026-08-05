import {canLevelUp} from '../../lib/levelling.js'
import {getWallet, setUserLevelRole} from '../../services/wallet.service.js'
import type {BeforePluginContext} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'
import {pickRandom} from '../../utils/random.js'
import {content} from '../../services/content.service.js'
import {createCooldownStore} from '../../lib/ephemeral-state.js'
import type {PluginInterceptor} from '../../types/plugin.js'

const multiplier = 650
const CHECK_INTERVAL_MS = 60_000
const levelCheckCooldowns = createCooldownStore({ttlMs: CHECK_INTERVAL_MS})
const roles = buildRoles()

export async function before(m: BotMessage, ctx: BeforePluginContext) {
    await applyAutoLevelUp(m, ctx, true)
}

export const interceptors: PluginInterceptor[] = [{
    phase: 'post',
    priority: 0,
    appliesTo: 'commands',
    failurePolicy: 'report-only',
    async run(m, ctx) {
        await applyAutoLevelUp(m, ctx, false)
        return {kind: 'continue'}
    },
}]

export async function applyAutoLevelUp(
    m: BotMessage,
    {conn, groupSettings, isGroup, branding}: BeforePluginContext,
    throttled: boolean,
): Promise<void> {
    if (!isGroup || !groupSettings?.autolevelup) return
    if (throttled && !shouldCheckLevel(m.sender)) return

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
        const message = content.renderTemplate(pickRandom(content.messageList('hooks.autoLevelUp.variants')), {
            user: senderMention,
            before,
            level: user.level,
            role: user.role
        })
        await conn.reply(m.chat, message, m, {
            contextInfo: {
                externalAdReply: {
                    mediaType: 1,
                    title: branding.watermark,
                    body: content.message('hooks.autoLevelUp.adBody'),
                    thumbnail: m.pp,
                    sourceUrl: info.md
                }
            }
        })
    }
}

export function getRole(level: number) {
    return roles.find(r => level >= r.level) || {level, name: content.message('hooks.autoLevelUp.defaultRole')}
}

function shouldCheckLevel(userId: string): boolean {
    const check = levelCheckCooldowns.check(userId)
    if (!check.allowed) return false
    levelCheckCooldowns.touch(userId)
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
