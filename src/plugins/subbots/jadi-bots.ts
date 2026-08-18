import {getSubbotConfig} from '../../services/subbot.service.js'
import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js'
import type {SubbotConfig} from '../../types/config.js'
import {getMainConnection, getSubbotConnections, type RuntimeConnection} from '../../core/runtime-state.js'

interface ActiveSubbot {
    socket: RuntimeConnection
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
    instanceType: 'subbot',
}

export default defineSdkPlugin({
    help: ['bots'],
    tags: ['jadibot'],
    command: /^bots$/i,
    async execute(_m, {sdk}) {
        const mainId = getMainBotId()
        const activeSubbots = getActiveSubbots(getSubbotConnections(), mainId)

        if (!activeSubbots.length) return sdk.reply.message('subbots.list.empty')

        const configs = await loadSubbotConfigs(activeSubbots.map((bot) => bot.configId))
        const lines = activeSubbots.map((bot) => {
            const config = configs.get(bot.configId) ?? fallbackSubbotConfig
            return formatSubbotLine(bot, config, sdk.content)
        })

        return sdk.reply.message('subbots.list.response', {
            count: activeSubbots.length,
            lines: lines.join('\n\n')
        })
    }
})

function getMainBotId(): string | undefined {
    return getMainConnection()?.user?.id?.split('@')[0].split(':')[0]
}

function getActiveSubbots(sockets: RuntimeConnection[], mainId?: string): ActiveSubbot[] {
    return sockets
        .map(toActiveSubbot)
        .filter((bot): bot is ActiveSubbot => bot !== null && bot.cleanId !== mainId)
}

function toActiveSubbot(socket: RuntimeConnection): ActiveSubbot | null {
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

function formatSubbotLine(bot: ActiveSubbot, config: SubbotConfig, pluginContent: PluginContentSdk): string {
    const mode = config.mode === 'private' ? pluginContent.message('subbots.list.modePrivate') : pluginContent.message('subbots.list.modePublic')
    const prefixes = Array.isArray(config.prefix) ? config.prefix : [config.prefix]
    const prefixText = prefixes.map((prefix) => `\`${prefix}\``).join(', ')
    const mainPrefix = prefixes[0] === '' ? '' : prefixes[0]
    const menuText = mainPrefix ? `${mainPrefix}menu` : 'menu'
    const uptime = bot.socket.uptime ? formatearMs(Date.now() - bot.socket.uptime) : pluginContent.message('subbots.list.unknown')
    const showNumber = !config.privacy
    const showLendOption = Boolean(config.prestar && !config.privacy)
    const title = showNumber
        ? `wa.me/${bot.cleanId}?text=${encodeURIComponent(menuText)} (${bot.name})`
        : `(${bot.name})`

    return pluginContent.renderMessage('subbots.list.line', {
        title,
        uptime,
        mode,
        prefixes: prefixText,
        lendLine: showLendOption ? pluginContent.message('subbots.list.lendLine') : ''
    })
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
