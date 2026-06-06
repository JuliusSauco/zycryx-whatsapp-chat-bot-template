import {getSubbotConfig} from '../../services/subbot.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import type {SubbotConfig} from '../../types/config.js'

type SubbotConnection = (typeof globalThis.conns)[number]

interface ActiveSubbot {
    socket: SubbotConnection
    configId: string
    cleanId: string
    name: string
}

const fallbackSubbotConfig: SubbotConfig = {
    prefix: ['/', '.', '#'],
    mode: 'public',
    owners: [],
    anti_private: true,
    anti_call: false,
    privacy: null,
    prestar: null,
    name: null,
    logo_url: null,
    tipo: null,
}

export default definePlugin({
    help: ['bots'],
    tags: ['jadibot'],
    command: /^bots$/i,
    async execute(m) {
        const mainId = getMainBotId()
        const activeSubbots = getActiveSubbots(globalThis.conns || [], mainId)

        if (!activeSubbots.length) return m.reply("❌ No hay subbots conectados en este momento.")

        const configs = await loadSubbotConfigs(activeSubbots.map((bot) => bot.configId))
        const lines = activeSubbots.map((bot) => {
            const config = configs.get(bot.configId) ?? fallbackSubbotConfig
            return formatSubbotLine(bot, config)
        })

        return m.reply(`🤖 *SubBots activos: ${activeSubbots.length}*\n\n${lines.join('\n\n')}`)
    }
})

function getMainBotId(): string | undefined {
    return globalThis.conn?.user?.id?.split('@')[0].split(':')[0]
}

function getActiveSubbots(sockets: SubbotConnection[], mainId?: string): ActiveSubbot[] {
    return sockets
        .map(toActiveSubbot)
        .filter((bot): bot is ActiveSubbot => bot !== null && bot.cleanId !== mainId)
}

function toActiveSubbot(socket: SubbotConnection): ActiveSubbot | null {
    if (typeof socket.uptime !== 'number') return null

    const userId = socket.user?.id
    const rawId = userId || socket.userId
    if (!rawId) return null

    const configId = normalizeSerializedId(rawId)
    const cleanId = configId.split('@')[0]
    return {
        socket,
        configId,
        cleanId,
        name: socket.user?.name || '-',
    }
}

async function loadSubbotConfigs(configIds: string[]): Promise<Map<string, SubbotConfig>> {
    const uniqueIds = Array.from(new Set(configIds))
    const entries = await Promise.all(uniqueIds.map(async (configId) => {
        try {
            return [configId, await getSubbotConfig(configId)] as const
        } catch {
            return [configId, {...fallbackSubbotConfig}] as const
        }
    }))

    return new Map(entries)
}

function formatSubbotLine(bot: ActiveSubbot, config: SubbotConfig): string {
    const mode = config.mode === 'private' ? 'Private' : 'Public'
    const prefixes = Array.isArray(config.prefix) ? config.prefix : [config.prefix]
    const prefixText = prefixes.map((prefix) => `\`${prefix}\``).join(', ')
    const mainPrefix = prefixes[0] === '' ? '' : prefixes[0]
    const menuText = mainPrefix ? `${mainPrefix}menu` : 'menu'
    const uptime = bot.socket.uptime ? formatearMs(Date.now() - bot.socket.uptime) : 'Desconocido'
    const showNumber = !config.privacy
    const showLendOption = Boolean(config.prestar && !config.privacy)
    const title = showNumber
        ? `wa.me/${bot.cleanId}?text=${encodeURIComponent(menuText)} (${bot.name})`
        : `(${bot.name})`

    return [
        `• ${title}`,
        `   ⏱️ Tiempo activo: *${uptime}*`,
        `   ⚙️ Modo: *${mode}*`,
        `   🛠️ Prefix: ${prefixText}`,
        showLendOption ? `   🟢 *Prestar bot*: #join <enlace>` : null,
    ].filter((line): line is string => Boolean(line)).join('\n')
}

function normalizeSerializedId(id: string): string {
    return id.replace(/:\d+/, '')
}

function formatearMs(ms: number) {
    const segundos = Math.floor(ms / 1000)
    const minutos = Math.floor(segundos / 60)
    const horas = Math.floor(minutos / 60)
    const dias = Math.floor(horas / 24)
    return `${dias}d ${horas % 24}h ${minutos % 60}m ${segundos % 60}s`
}
