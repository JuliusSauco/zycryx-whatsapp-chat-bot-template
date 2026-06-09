import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {getGroupSettings, setGroupAutoAcceptMode, setGroupBooleanFlag} from '../../services/group-settings.service.js'
import {getSubbotConfig, setSubbotBooleanFlag} from '../../services/subbot.service.js'
import type {AutoAcceptMode, GroupSettings} from '../../types/config.js'

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

export default definePlugin({
    help: ['enable <opción>', 'disable <opción>'],
    tags: ['nable'],
    command: /^((en|dis)able|(tru|fals)e|(turn)?o(n|ff)|[01])$/i,
    register: true,
    async execute(m, {conn, args, usedPrefix, command, isAdmin, isOwner}) {
    const isEnable = /true|enable|(turn)?on|1/i.test(command)
    const type = (args[0] || '').toLowerCase()
    const chatId = m.chat
    const botId = conn.user?.id
    if (!botId) return m.reply(getRequiredPluginMessage('config.toggle.missingBotId'))
    const cleanId = botId.replace(/:\d+/, '')
    const isSubbot = botId !== 'main'
    let isAll = false, isUser = false
    let selectedAutoAcceptMode: AutoAcceptMode | null = null
    const chat: Partial<GroupSettings> = await getGroupSettings(chatId) || {}
    const enabledIcon = getRequiredPluginMessage('config.toggle.enabledIcon')
    const disabledIcon = getRequiredPluginMessage('config.toggle.disabledIcon')
    const notGroupIcon = getRequiredPluginMessage('config.toggle.notGroupIcon')
    const getStatus = (flag: keyof GroupSettings) => m.isGroup ? (chat[flag] ? enabledIcon : disabledIcon) : notGroupIcon
    const botConfig = isSubbot ? await getSubbotConfig(botId) : null
    const getSubbotStatus = (enabled?: boolean) => isSubbot ? (enabled ? enabledIcon : disabledIcon) : notGroupIcon
    const groupOnly = getRequiredPluginMessage('config.toggle.groupOnly')
    const adminOnly = getRequiredPluginMessage('config.toggle.adminOnly')

    const menu = renderTemplate(getRequiredPluginMessage('config.toggle.menu'), {
        command: usedPrefix + command,
        prefix: usedPrefix,
        welcome: getStatus('welcome'),
        welcomeHidetag: getStatus('welcomeHidetag'),
        byeHidetag: getStatus('byeHidetag'),
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
            await setGroupBooleanFlag(chatId, 'welcome', isEnable)
            break

        case 'welcomehidetag':
        case 'welcome_hidetag':
        case 'bienvenidahidetag':
        case 'hidetagbienvenida':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'welcomeHidetag', isEnable)
            break

        case 'byehidetag':
        case 'bye_hidetag':
        case 'despedidahidetag':
        case 'hidetagdespedida':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            await setGroupBooleanFlag(chatId, 'byeHidetag', isEnable)
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
            if (!isAdmin) throw adminOnly
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

    await m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.updated'), {
        type,
        target: isAll ? getRequiredPluginMessage('config.toggle.targetAll') : isUser ? getRequiredPluginMessage('config.toggle.targetUser') : getRequiredPluginMessage('config.toggle.targetChat'),
        status: isEnable ? getRequiredPluginMessage('config.toggle.enabledLabel') : getRequiredPluginMessage('config.toggle.disabledLabel'),
    }))
    }
})
