import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {getGroupSettings, setGroupAutoAcceptMode, setGroupAutoresponderMode, setGroupAutoresponderTrigger, setGroupBooleanFlag, setGroupBotAccessMode, setGroupFeatureAccessMode, setGroupGreetingHidetagMode, setGroupNsfwMode} from '../../services/group-settings.service.js'
import {getSubbotConfig, setSubbotBooleanFlag} from '../../services/subbot.service.js'
import {isGroupCreator} from '../../utils/group-creator.js'
import {getToggleSectionKey, renderToggleMenu} from './config-toggle-menu.js'
import type {ConfigurableFeatureKey} from '../../ports/repositories.js'
import type {AccessMode, AutoAcceptMode, AutoresponderTrigger, GreetingHidetagMode, GroupSettings} from '../../types/config.js'

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

function resolveAccessMode(args: string[], fallback: AccessMode): AccessMode {
    const flags = args.slice(1).map(arg => arg.toLowerCase())
    if (flags.includes('--owner') || flags.includes('--owners')) return 'owner'
    if (flags.includes('--superadmin') || flags.includes('--creator') || flags.includes('--creador')) return 'superadmin'
    if (flags.includes('--admin') || flags.includes('--admins')) return 'admin'
    if (flags.includes('--all') || flags.includes('--todos')) return 'all'
    return fallback
}

function getAccessModeLabel(mode?: AccessMode | null, legacyAdminMode?: boolean): string {
    switch (mode || (legacyAdminMode ? 'admin' : 'all')) {
        case 'owner':
            return 'solo owners'
        case 'superadmin':
            return 'solo creador del grupo'
        case 'admin':
            return 'solo admins'
        default:
            return 'todos'
    }
}

function resolveAutoresponderTrigger(args: string[]): AutoresponderTrigger | null {
    const flags = args.slice(1).map(arg => arg.toLowerCase())
    if (flags.includes('--triggerall') || flags.includes('--allmessages') || flags.includes('--todo') || flags.includes('--always')) return 'all'
    if (flags.includes('--triggermention') || flags.includes('--mention') || flags.includes('--mentions') || flags.includes('--gatillo')) return 'mention'
    return null
}

function getAutoresponderTriggerLabel(trigger?: AutoresponderTrigger | null): string {
    return trigger === 'all' ? 'todos los mensajes' : 'menciones y palabras gatillo'
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
    help: [
        'enable',
        'enable saludos',
        'enable moderacion',
        'enable acceso',
        'enable familias',
        'enable ia',
        'enable adulto',
        'enable subbot',
        'enable nsfw --admin',
        'enable bot --admin',
        'enable autoresponder --triggerall',
        'enable juegos --admin',
        'enable herramientas --admin',
        'enable rpg --admin',
        'enable descargas --admin',
        'enable buscadores --admin',
        'enable stickers --admin',
        'enable convertidores --admin',
        'enable diversion --admin',
        'disable <opcion>',
    ],
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
    let selectedBotAccessMode: AccessMode | null = null
    let selectedFeatureAccessMode: {feature: string; key: ConfigurableFeatureKey; mode: AccessMode} | null = null
    let selectedAutoresponderMode: {enabled: boolean; mode: AccessMode} | null = null
    let selectedAutoresponderTrigger: AutoresponderTrigger | null = null
    let selectedNsfwMode: {enabled: boolean; mode: AccessMode} | null = null
    let selectedGreetingConfig: {type: 'welcome' | 'bye'; enabled: boolean; hidetagMode: GreetingHidetagMode} | null = null
    const chat: Partial<GroupSettings> = await getGroupSettings(chatId) || {}
    const enabledIcon = getRequiredPluginMessage('config.toggle.enabledIcon')
    const disabledIcon = getRequiredPluginMessage('config.toggle.disabledIcon')
    const notGroupIcon = getRequiredPluginMessage('config.toggle.notGroupIcon')
    const botConfig = isSubbot ? await getSubbotConfig(botId) : null
    const groupOnly = getRequiredPluginMessage('config.toggle.groupOnly')
    const adminOnly = getRequiredPluginMessage('config.toggle.adminOnly')
    const ownerOrGroupCreatorOnly = getRequiredPluginMessage('config.toggle.ownerOrGroupCreatorOnly')
    const isFounder = m.isGroup && isGroupCreator({chatId: contextChatId || chatId, sender: m.sender, senderLid: m.lid, metadata})

    const menuState = {
        command,
        prefix: usedPrefix,
        isGroup: m.isGroup,
        enabledIcon,
        disabledIcon,
        notGroupIcon,
        group: chat,
        subbot: botConfig,
        isSubbot,
        isAdmin,
        isOwner,
        isGroupCreator: isFounder,
    }
    const sectionKey = getToggleSectionKey(type)
    const menu = renderToggleMenu(menuState, sectionKey)
    if (!type || sectionKey) return m.reply(menu)

    const configureFeatureAccess = async (input: FeatureAccessInput) => {
        if (!m.isGroup) throw groupOnly
        const mode = isEnable ? resolveAccessMode(args, 'all') : 'all'
        if (mode === 'owner') {
            if (!isOwner) throw getRequiredPluginMessage('config.toggle.ownerOnly')
        } else if (mode === 'superadmin') {
            if (!isOwner && !isFounder) throw ownerOrGroupCreatorOnly
        } else if (!isAdmin) {
            throw adminOnly
        }
        await setGroupFeatureAccessMode(chatId, input.key, mode)
        return {feature: input.label, key: input.key, mode}
    }

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

        case 'autoresponder':
        case 'autorespond':
        case 'ia':
        case 'chatbot':
            if (!m.isGroup) throw groupOnly
            {
                const trigger = resolveAutoresponderTrigger(args)
                if (trigger) {
                    if (!isAdmin) throw adminOnly
                    selectedAutoresponderTrigger = isEnable ? trigger : 'mention'
                    await setGroupAutoresponderTrigger(chatId, selectedAutoresponderTrigger)
                    break
                }
                const mode = isEnable ? resolveAccessMode(args, 'all') : 'all'
                if (mode === 'owner') {
                    if (!isOwner) throw getRequiredPluginMessage('config.toggle.ownerOnly')
                } else if (mode === 'superadmin') {
                    if (!isOwner && !isFounder) throw ownerOrGroupCreatorOnly
                } else if (!isAdmin) {
                    throw adminOnly
                }
                selectedAutoresponderMode = {enabled: isEnable, mode}
                await setGroupAutoresponderMode(chatId, isEnable, mode)
            }
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
            selectedNsfwMode = {enabled: isEnable, mode: isEnable ? resolveAccessMode(args, 'all') : 'all'}
            if (selectedNsfwMode.mode === 'owner') {
                if (!isOwner) throw getRequiredPluginMessage('config.toggle.ownerOnly')
            } else if (!isOwner && !isFounder) {
                throw ownerOrGroupCreatorOnly
            }
            await setGroupNsfwMode(chatId, selectedNsfwMode.enabled, selectedNsfwMode.mode)
            break

        case 'modoadmin':
        case 'onlyadmin':
            if (!m.isGroup) throw groupOnly
            if (!isAdmin) throw adminOnly
            selectedBotAccessMode = isEnable ? 'admin' : 'all'
            await setGroupBotAccessMode(chatId, selectedBotAccessMode)
            break

        case 'modosuperadmin':
        case 'onlysuperadmin':
            if (!m.isGroup) throw groupOnly
            if (!isOwner && !isFounder) throw ownerOrGroupCreatorOnly
            selectedBotAccessMode = isEnable ? 'superadmin' : 'all'
            await setGroupBotAccessMode(chatId, selectedBotAccessMode)
            break

        case 'modoowner':
        case 'onlyowner':
            if (!m.isGroup) throw groupOnly
            if (!isOwner) throw getRequiredPluginMessage('config.toggle.ownerOnly')
            selectedBotAccessMode = isEnable ? 'owner' : 'all'
            await setGroupBotAccessMode(chatId, selectedBotAccessMode)
            break

        case 'bot':
        case 'accesobot':
        case 'botaccess':
            if (!m.isGroup) throw groupOnly
            selectedBotAccessMode = isEnable ? resolveAccessMode(args, 'all') : 'all'
            if (selectedBotAccessMode === 'owner') {
                if (!isOwner) throw getRequiredPluginMessage('config.toggle.ownerOnly')
            } else if (selectedBotAccessMode === 'superadmin') {
                if (!isOwner && !isFounder) throw ownerOrGroupCreatorOnly
            } else if (!isAdmin) {
                throw adminOnly
            }
            await setGroupBotAccessMode(chatId, selectedBotAccessMode)
            break

        case 'juegos':
        case 'games':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'games', label: 'juegos'})
            break

        case 'herramientas':
        case 'tools':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'tools', label: 'herramientas'})
            break

        case 'rpg':
        case 'economia':
        case 'economía':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'rpg', label: 'rpg'})
            break

        case 'descargas':
        case 'downloads':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'downloads', label: 'descargas'})
            break

        case 'buscadores':
        case 'busquedas':
        case 'búsquedas':
        case 'search':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'search', label: 'buscadores'})
            break

        case 'stickers':
        case 'sticker':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'stickers', label: 'stickers'})
            break

        case 'convertidores':
        case 'converters':
        case 'convertidor':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'converters', label: 'convertidores'})
            break

        case 'diversion':
        case 'diversión':
        case 'fun':
        case 'random':
            selectedFeatureAccessMode = await configureFeatureAccess({key: 'fun', label: 'diversion/random'})
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

    if (selectedBotAccessMode) {
        return m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.botAccessConfigured'), {
            status: getAccessModeLabel(selectedBotAccessMode),
        }))
    }

    if (selectedAutoresponderMode) {
        return m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.autoresponderConfigured'), {
            status: selectedAutoresponderMode.enabled ? getRequiredPluginMessage('config.toggle.enabledLabel') : getRequiredPluginMessage('config.toggle.disabledLabel'),
            access: getAccessModeLabel(selectedAutoresponderMode.mode),
        }))
    }

    if (selectedAutoresponderTrigger) {
        return m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.autoresponderTriggerConfigured'), {
            trigger: getAutoresponderTriggerLabel(selectedAutoresponderTrigger),
        }))
    }

    if (selectedNsfwMode) {
        return m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.nsfwConfigured'), {
            status: selectedNsfwMode.enabled ? getRequiredPluginMessage('config.toggle.enabledLabel') : getRequiredPluginMessage('config.toggle.disabledLabel'),
            access: getAccessModeLabel(selectedNsfwMode.mode),
        }))
    }

    if (selectedFeatureAccessMode) {
        return m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.featureAccessConfigured'), {
            feature: selectedFeatureAccessMode.feature,
            access: getAccessModeLabel(selectedFeatureAccessMode.mode),
        }))
    }

    await m.reply(renderTemplate(getRequiredPluginMessage('config.toggle.updated'), {
        type,
        target: isAll ? getRequiredPluginMessage('config.toggle.targetAll') : isUser ? getRequiredPluginMessage('config.toggle.targetUser') : getRequiredPluginMessage('config.toggle.targetChat'),
        status: isEnable ? getRequiredPluginMessage('config.toggle.enabledLabel') : getRequiredPluginMessage('config.toggle.disabledLabel'),
    }))
    }
})

type FeatureAccessInput = {
    key: ConfigurableFeatureKey;
    label: string;
};
