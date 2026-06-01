import {getGroupSettings, setGroupAutoAcceptMode, setGroupBooleanFlag} from '../../services/group-settings.service.js'
import {getSubbotConfig, setSubbotBooleanFlag} from '../../services/subbot.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import type {AutoAcceptMode, GroupSettings} from '../../types/config.js'

function getAutoAcceptModeLabel(mode?: AutoAcceptMode | null): string {
    switch (mode || 'off') {
        case 'on':
            return '✅ Autoacepta en silencio';
        case 'on_hidetag_admin':
            return '✅ Autoacepta y avisa a admins';
        case 'on_hidetag_all':
            return '✅ Autoacepta y avisa al grupo';
        case 'off_hidetag_admin':
            return '❌ No autoacepta, avisa a admins';
        case 'off_hidetag_all':
            return '❌ No autoacepta, avisa al grupo';
        default:
            return '❌ No hace nada';
    }
}

function resolveAutoAcceptMode(isEnable: boolean, args: string[]): AutoAcceptMode {
    const flags = args.slice(1).map(arg => arg.toLowerCase());
    const hidetagAdmin = flags.includes('--hidetagadmin') || flags.includes('--admin') || flags.includes('--admins');
    const hidetagAll = flags.includes('--hidetag') || flags.includes('--todos') || flags.includes('--all');

    if (isEnable) {
        if (hidetagAdmin) return 'on_hidetag_admin';
        if (hidetagAll) return 'on_hidetag_all';
        return 'on';
    }
    if (hidetagAdmin) return 'off_hidetag_admin';
    if (hidetagAll) return 'off_hidetag_all';
    return 'off';
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
    if (!botId) return m.reply('❌ No se pudo identificar este bot.')
    const cleanId = botId.replace(/:\d+/, '');
    const isSubbot = botId !== 'main'
    let isAll = false, isUser = false
    let selectedAutoAcceptMode: AutoAcceptMode | null = null
    let chat: Partial<GroupSettings> = await getGroupSettings(chatId) || {};
    const getStatus = (flag: keyof GroupSettings) => m.isGroup ? (chat[flag] ? '✅' : '❌') : '⚠️';

    let menu = `*『 ⧼⧼⧼ ＣＯＮＦＩＧＵＲＡＣＩＯ́Ｎ ⧽⧽⧽ 』*\n\n`;
    menu += `> *Seleccione una opción de la lista*\n> *Para empezar a Configurar*\n\n`;
    menu += `● *Avisos de la Configuracion:*
✅ ⇢ *Función Activada*
❌ ⇢ *Función Desactivada*
⚠️ ⇢ *Este Chat no es un Grupo*\n\n`;
    menu += `*『 FUNCIONES PARA ADMINS 』*\n\n`;
    menu += `🎉 BIENVENIDA ${getStatus('welcome')}\n• Mensaje de bienvenida\n• ${usedPrefix + command} welcome\n\n`;
    menu += `📢 HIDETAG BIENVENIDA ${getStatus('welcomeHidetag')}\n• Mencionar a todos en la bienvenida\n• ${usedPrefix + command} welcomehidetag\n\n`;
    menu += `📢 HIDETAG DESPEDIDA ${getStatus('byeHidetag')}\n• Mencionar a todos en la despedida\n• ${usedPrefix + command} byehidetag\n\n`;
    menu += `📣 DETECTAR AVISOS ${getStatus('detect')}\n• Avisar cambios en el grupo\n• ${usedPrefix + command} detect\n\n`;
    menu += `🔗 ANTILINK ${getStatus('antilink')}\n• Detectar enlaces de grupo\n• ${usedPrefix + command} antilink\n\n`;
    menu += `🌐 ANTILINK2 ${getStatus('antilink2')}\n• Detectar cualquier link\n• ${usedPrefix + command} antilink2\n\n`;
    menu += `🛡️ VIRUSTOTAL ${getStatus('virusTotal')}\n• Analizar archivos y enlaces enviados al grupo\n• ${usedPrefix + command} virustotal\n\n`;
    menu += `🕵️ ANTIFAKE ${getStatus('antifake')}\n• Bloquear números de otros países\n• ${usedPrefix + command} antifake\n\n`;
    menu += `🔞 NSFW ${getStatus('modohorny')}\n• Contenido +18 en stickers/gifs\n• ${usedPrefix + command} modohorny\n\n`
    menu += `🔒 MODO SOLO ADMIN ${getStatus('modoadmin')}\n• Solo admins pueden usar comandos\n• ${usedPrefix + command} modoadmin\n\n`;
    menu += `🛂 AUTOACEPTAR ${m.isGroup ? getAutoAcceptModeLabel(chat.autoAcceptMode) : '⚠️'}\n• Gestionar solicitudes de ingreso al grupo\n• ${usedPrefix}enable autoaceptar\n• ${usedPrefix}enable autoaceptar --hidetagadmin\n• ${usedPrefix}enable autoaceptar --hidetag\n• ${usedPrefix}disable autoaceptar\n• ${usedPrefix}disable autoaceptar --hidetagadmin\n• ${usedPrefix}disable autoaceptar --hidetag\n\n`;

    menu += `\n*『 FUNCIONES PARA OWNER 』*\n\n`;
    const botConfig = isSubbot ? await getSubbotConfig(botId) : null;
    menu += `🚫 ANTIPRIVADO ${isSubbot ? (botConfig?.anti_private ? '✅' : '❌') : '⚠️'}
• Bloquear uso en privado
• ${usedPrefix + command} antiprivate\n\n`;
    menu += `📵 ANTILLAMADAS ${isSubbot ? (botConfig?.anti_call ? '✅' : '❌') : '⚠️'}
• Bloquear llamadas
• ${usedPrefix + command} anticall`;

    switch (type) {
        case 'welcome':
        case 'bienvenida':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'welcome', isEnable)
            break

        case 'welcomehidetag':
        case 'welcome_hidetag':
        case 'bienvenidahidetag':
        case 'hidetagbienvenida':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'welcomeHidetag', isEnable)
            break

        case 'byehidetag':
        case 'bye_hidetag':
        case 'despedidahidetag':
        case 'hidetagdespedida':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'byeHidetag', isEnable)
            break

        case 'detect':
        case 'avisos':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'detect', isEnable)
            break

        case 'antilink':
        case 'antienlace':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'antilink', isEnable)
            break

        case 'antilink2':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'antilink2', isEnable)
            break

        case 'virustotal':
        case 'virus':
        case 'vt':
        case 'antivirus':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'virusTotal', isEnable)
            break

        case 'antiporn':
        case 'antiporno':
        case 'antinwfs':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'antiporn', isEnable)
            break

        case 'audios':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'audios', isEnable)
            break

        case 'antifake':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'antifake', isEnable)
            break

        case 'nsfw':
        case "modohorny":
        case "modocaliente":
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'modohorny', isEnable)
            break

        case 'modoadmin':
        case 'onlyadmin':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            await setGroupBooleanFlag(chatId, 'modoadmin', isEnable)
            break

        case 'autoaceptar':
        case 'autoacept':
        case 'autoaccept':
        case 'aceptar':
        case 'solicitudes':
            if (!m.isGroup) throw '⚠️ Este comando solo se puede usar dentro de un grupo.'
            if (!isAdmin) throw "⚠️ Solo los admins puede usar este comando.";
            selectedAutoAcceptMode = resolveAutoAcceptMode(isEnable, args)
            await setGroupAutoAcceptMode(chatId, selectedAutoAcceptMode)
            break

        case 'antiprivate':
        case 'antiprivado':
            if (!isSubbot && !isOwner) return m.reply('❌ Solo el owner o subbots pueden cambiar esto.');
            await setSubbotBooleanFlag(cleanId, 'anti_private', isEnable);
            isAll = true;
            break;

        case 'anticall':
        case 'antillamada':
            if (!isSubbot && !isOwner) return m.reply('❌ Solo el owner o subbots pueden cambiar esto.');
            await setSubbotBooleanFlag(cleanId, 'anti_call', isEnable);
            isAll = true;
            break;
        default:
            return m.reply(menu.trim());
    }
    if (selectedAutoAcceptMode) {
        return m.reply(`🛂 La opción *autoaceptar* quedó configurada como:\n${getAutoAcceptModeLabel(selectedAutoAcceptMode)}`)
    }
    await m.reply(`🗂️ La opción *${type}* para ${isAll ? 'todo el bot' : isUser ? 'este usuario' : 'este chat'} fue *${isEnable ? 'activada' : 'desactivada'}* correctamente.`)
    }
})
