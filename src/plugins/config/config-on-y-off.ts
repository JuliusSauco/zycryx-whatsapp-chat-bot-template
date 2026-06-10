import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {getGroupSettings, setGroupAutoAcceptMode, setGroupBooleanFlag, setGroupGreetingHidetagMode} from '../../services/group-settings.service.js'
import {getSubbotConfig, setSubbotBooleanFlag} from '../../services/subbot.service.js'
import {isGroupCreator} from '../../utils/group-creator.js'
import type {AutoAcceptMode, GreetingHidetagMode, GroupSettings} from '../../types/config.js'

function getAutoAcceptModeLabel(mode?: AutoAcceptMode | null): string {
    switch (mode || 'off') {
        case 'on':
            return getRequiredPluginMessage('config.toggle.autoAcceptOnSilent')
        case 'on_hidetag_admin':
            return getRequiredPluginMessage('config.toggle.autoAcceptOnAdmins')
        case 'on_hidetag_all':
            return getRequiredPluginMessage('config.toggle.autoAcceptOnAll')
        case 'off_hidetag_admin':
            return getRequiredPluginMessage('config.toggle.autoAcceptOffAdmins')
        case 'off_hidetag_all':
            return getRequiredPluginMessage('config.toggle.autoAcceptOffAll')
        default:
            return getRequiredPluginMessage('config.toggle.autoAcceptOff')
    }
}

function resolveAutoAcceptMode(isEnable: boolean, args: string[]): AutoAcceptMode {
    const flags = args.slice(1).map(arg => arg.toLowerCase())
    const hidetagAdmin = flags.includes('--hidetagadmin') || flags.includes('--admin') || flags.includes('--admins')
    const hidetagAll = flags.includes('--hidetag') || flags.includes('--todos') || flags.includes('--all')

    if (isEnable) {
        if (hidetagAdmin) return 'on_hidetag_admin'
        if (hidetagAll) return 'on_hidetag_all'
        return 'on'
    }
    if (hidetagAdmin) return 'off_hidetag_admin'
    if (hidetagAll) return 'off_hidetag_all'
    return 'off'
}

function resolveGreetingHidetagMode(args: string[]): GreetingHidetagMode | null {
    const flags = args.slice(1).map(arg => arg.toLowerCase())
    if (flags.includes('--hidetagadmin') || flags.includes('--admin') || flags.includes('--admins')) return 'admin'
    if (flags.includes('--hidetag') || flags.includes('--todos') || flags.includes('--all')) return 'all'
    return null
}

function getGreetingHidetagModeLabel(mode?: GreetingHidetagMode | null, legacyHidetag?: boolean): string {
    const normalizedMode = getCurrentGreetingHidetagMode(mode, legacyHidetag)
    if (normalizedMode === 'admin') return 'admins'
    if (normalizedMode === 'all') return 'todos'
    return 'sin hidetag'
}

function getCurrentGreetingHidetagMode(mode?: GreetingHidetagMode | null, legacyHidetag?: boolean): GreetingHidetagMode {
    return mode || (legacyHidetag ? 'all' : 'off')
}

export default definePlugin({
    help: ['enable <opción>', 'disable <opción>'],
    tags: ['nable'],
    command: /^((en|dis)able|(tru|fals)e|(turn)?o(n|ff)|[01])$/i,
    register: true,
    async execute(m, {conn, args, usedPrefix, command, isAdmin, isOwner, metadata, chatId: contextChatId}) {
    const isEnable = /true|enable|(turn)?on|1/i.test(command)
    const type = (args[0] || '').toLowerCase()
    const chatId = m.chat
    const botId = conn.user?.id
    if (!botId) return m.reply(getRequiredPluginMessage('config.toggle.missingBotId'))
    const cleanId = botId.replace(/:\d+/, '')
    const isSubbot = botId !== 'main'
    let isAll = false, isUser = false
    let selectedAutoAcceptMode: AutoAcceptMode | null = null
    let selectedGreetingConfig: {type: 'welcome' | 'bye'; enabled: boolean; hidetagMode: GreetingHidetagMode} | null = null
    const chat: Partial<GroupSettings> = await getGroupSettings(chatId) || {}
    const enabledIcon = getRequiredPluginMessage('config.toggle.enabledIcon')
    const disabledIcon = getRequiredPluginMessage('config.toggle.disabledIcon')
    const notGroupIcon = getRequiredPluginMessage('config.toggle.notGroupIcon')
    const defaultEnabledFlags: Partial<Record<keyof GroupSettings, boolean>> = {welcome: true, bye: true, detect: true}
    const getStatus = (flag: keyof GroupSettings) => {
        if (!m.isGroup) return notGroupIcon
        const value = chat[flag]
        return (typeof value === 'boolean' ? value : defaultEnabledFlags[flag]) ? enabledIcon : disabledIcon
    }
    const botConfig = isSubbot ? await getSubbotConfig(botId) : null
    const getSubbotStatus = (enabled?: boolean) => isSubbot ? (enabled ? enabledIcon : disabledIcon) : notGroupIcon
    const groupOnly = getRequiredPluginMessage('config.toggle.groupOnly')
    const adminOnly = getRequiredPluginMessage('config.toggle.adminOnly')
    const ownerOrGroupCreatorOnly = getRequiredPluginMessage('config.toggle.ownerOrGroupCreatorOnly')

    const menu = renderTemplate(getRequiredPluginMessage('config.toggle.menu'), {
        command: usedPrefix + command,
        prefix: usedPrefix,
        welcome: getStatus('welcome'),
        welcomeHidetag: m.isGroup ? getGreetingHidetagModeLabel(chat.welcomeHidetagMode, chat.welcomeHidetag) : notGroupIcon,
        bye: getStatus('bye'),
        byeHidetag: m.isGroup ? getGreetingHidetagModeLabel(chat.byeHidetagMode, chat.byeHidetag) : notGroupIcon,
        detect: getStatus('detect'),
        antilink: getStatus('antilink'),
        antilink2: getStatus('antilink2'),
        virusTotal: getStatus('virusTotal'),
        antifake: getStatus('antifake'),
        modohorny: getStatus('modohorny'),
        modoadmin: getStatus('modoadmin'),
        autoAccept: m.isGroup ? getAutoAcceptModeLabel(chat.autoAcceptMode) : notGroupIcon,
        messageLogging: getStatus('messageLogging'),
        antiPrivate: getSubbotStatus(botConfig?.anti_private),
        antiCall: getSubbotStatus(botConfig?.anti_call),
    })

    switch (type) {
        case 'welcome':
        case 'bienvenida':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            {
                const mode = resolveGreetingHidetagMode(args)
                if (!isEnable && mode) {
                    await setGroupBooleanFlag(chatId, 'welcome', true)
                    await setGroupGreetingHidetagMode(chatId, 'welcome', 'off')
                    selectedGreetingConfig = {type: 'welcome', enabled: true, hidetagMode: 'off'}
                    break
                }
                await setGroupBooleanFlag(chatId, 'welcome', isEnable)
                const nextMode = isEnable ? mode || 'off' : getCurrentGreetingHidetagMode(chat.welcomeHidetagMode, chat.welcomeHidetag)
                if (isEnable) await setGroupGreetingHidetagMode(chatId, 'welcome', nextMode)
                selectedGreetingConfig = {type: 'welcome', enabled: isEnable, hidetagMode: nextMode}
            }
            break

        case 'bye':
        case 'despedida':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            {
                const mode = resolveGreetingHidetagMode(args)
                if (!isEnable && mode) {
                    await setGroupBooleanFlag(chatId, 'bye', true)
                    await setGroupGreetingHidetagMode(chatId, 'bye', 'off')
                    selectedGreetingConfig = {type: 'bye', enabled: true, hidetagMode: 'off'}
                    break
                }
                await setGroupBooleanFlag(chatId, 'bye', isEnable)
                const nextMode = isEnable ? mode || 'off' : getCurrentGreetingHidetagMode(chat.byeHidetagMode, chat.byeHidetag)
                if (isEnable) await setGroupGreetingHidetagMode(chatId, 'bye', nextMode)
                selectedGreetingConfig = {type: 'bye', enabled: isEnable, hidetagMode: nextMode}
            }
            break

        case 'welcomehidetag':
        case 'welcome_hidetag':
        case 'bienvenidahidetag':
        case 'hidetagbienvenida':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupGreetingHidetagMode(chatId, 'welcome', isEnable ? 'all' : 'off')
            selectedGreetingConfig = {type: 'welcome', enabled: chat.welcome ?? true, hidetagMode: isEnable ? 'all' : 'off'}
            break

        case 'byehidetag':
        case 'bye_hidetag':
        case 'despedidahidetag':
        case 'hidetagdespedida':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupGreetingHidetagMode(chatId, 'bye', isEnable ? 'all' : 'off')
            selectedGreetingConfig = {type: 'bye', enabled: chat.bye ?? true, hidetagMode: isEnable ? 'all' : 'off'}
            break

        case 'detect':
        case 'avisos':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'detect', isEnable)
            break

        case 'antilink':
        case 'antienlace':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'antilink', isEnable)
            break

        case 'antilink2':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'antilink2', isEnable)
            break

        case 'virustotal':
        case 'virus':
        case 'vt':
        case 'antivirus':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'virusTotal', isEnable)
            break

        case 'antiporn':
        case 'antiporno':
        case 'antinwfs':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'antiporn', isEnable)
            break

        case 'audios':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'audios', isEnable)
            break

        case 'antifake':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'antifake', isEnable)
            break

        case 'nsfw':
        case 'modohorny':
        case 'modocaliente':
            if (!m.isGroup) throw groupOnly
            if (!isOwner && !isGroupCreator({chatId: contextChatId || chatId, sender: m.sender, senderLid: m.lid, metadata})) throw ownerOrGroupCreatorOnly
            await setGroupBooleanFlag(chatId, 'modohorny', isEnable)
            break

        case 'modoadmin':
        case 'onlyadmin':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'modoadmin', isEnable)
            break

        case 'autoaceptar':
        case 'autoacept':
        case 'autoaccept':
        case 'aceptar':
        case 'solicitudes':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            selectedAutoAcceptMode = resolveAutoAcceptMode(isEnable, args)
            await setGroupAutoAcceptMode(chatId, selectedAutoAcceptMode)
            break

        case 'msglog':
        case 'messagelog':
        case 'registromsg':
        case 'registrarmensajes':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'messageLogging', isEnable)
            break

        case 'antiprivate':
        case 'antiprivado':
            if (!isSubbot && !isOwner) return m.reply(getRequiredPluginMessage('config.toggle.ownerOrSubbotOnly'))
            await setSubbotBooleanFlag(cleanId, 'anti_private', isEnable)
            isAll = true
            break

        case 'anticall':
        case 'antillamada':
            if (!isSubbot && !isOwner) return m.reply(getRequiredPluginMessage('config.toggle.ownerOrSubbotOnly'))
            await setSubbotBooleanFlag(cleanId, 'anti_call', isEnable)
            isAll = true
            break

        default:
            return m.reply(menu.trim())
    }

    if (selectedAutoAcceptMode) {
        return m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.autoAcceptConfigured'), {
            status: getAutoAcceptModeLabel(selectedAutoAcceptMode),
        }))
    }

    if (selectedGreetingConfig) {
        return m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.greetingConfigured'), {
            type: selectedGreetingConfig.type,
            status: selectedGreetingConfig.enabled ? getRequiredPluginMessage('config.toggle.enabledLabel') : getRequiredPluginMessage('config.toggle.disabledLabel'),
            hidetag: getGreetingHidetagModeLabel(selectedGreetingConfig.hidetagMode),
        }))
    }

    await m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.updated'), {
        type,
        target: isAll ? getRequiredPluginMessage('config.toggle.targetAll') : isUser ? getRequiredPluginMessage('config.toggle.targetUser') : getRequiredPluginMessage('config.toggle.targetChat'),
        status: isEnable ? getRequiredPluginMessage('config.toggle.enabledLabel') : getRequiredPluginMessage('config.toggle.disabledLabel'),
    }))
    }
})
