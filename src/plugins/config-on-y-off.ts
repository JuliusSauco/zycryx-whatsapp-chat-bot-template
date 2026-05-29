import {getGroupSettings, setGroupBooleanFlag} from '../services/group-settings.service.js'
import {getSubbotConfig, setSubbotBooleanFlag} from '../services/subbot.service.js'
import {definePlugin} from '../core/define-plugin.js'

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
    let chat: Record<string, any> = await getGroupSettings(chatId) || {};
    const getStatus = (flag: string) => m.isGroup ? (chat[flag] ? '✅' : '❌') : '⚠️';

    let menu = `*『 ⧼⧼⧼ ＣＯＮＦＩＧＵＲＡＣＩＯ́Ｎ ⧽⧽⧽ 』*\n\n`;
    menu += `> *Seleccione una opción de la lista*\n> *Para empezar a Configurar*\n\n`;
    menu += `● *Avisos de la Configuracion:*
✅ ⇢ *Función Activada*
❌ ⇢ *Función Desactivada*
⚠️ ⇢ *Este Chat no es un Grupo*\n\n`;
    menu += `*『 FUNCIONES PARA ADMINS 』*\n\n`;
    menu += `🎉 BIENVENIDA ${getStatus('welcome')}\n• Mensaje de bienvenida\n• ${usedPrefix + command} welcome\n\n`;
    menu += `📣 DETECTAR AVISOS ${getStatus('detect')}\n• Avisar cambios en el grupo\n• ${usedPrefix + command} detect\n\n`;
    menu += `🔗 ANTILINK ${getStatus('antilink')}\n• Detectar enlaces de grupo\n• ${usedPrefix + command} antilink\n\n`;
    menu += `🌐 ANTILINK2 ${getStatus('antilink2')}\n• Detectar cualquier link\n• ${usedPrefix + command} antilink2\n\n`;
    menu += `🕵️ ANTIFAKE ${getStatus('antifake')}\n• Bloquear números de otros países\n• ${usedPrefix + command} antifake\n\n`;
    menu += `🔞 NSFW ${getStatus('modohorny')}\n• Contenido +18 en stickers/gifs\n• ${usedPrefix + command} modohorny\n\n`
    menu += `🔒 MODO SOLO ADMIN ${getStatus('modoadmin')}\n• Solo admins pueden usar comandos\n• ${usedPrefix + command} modoadmin\n\n`;

    menu += `\n*『 FUNCIONES PARA OWNER 』*\n\n`;
    // @ts-ignore
    const botConfig = isSubbot ? await getSubbotConfig(botId) : null;
    menu += `🚫 ANTIPRIVADO ${isSubbot ? (botConfig?.anti_private ? '✅' : '❌') : '⚠️'}
• Bloquear uso en privado
• ${usedPrefix + command} antiprivate\n\n`;
    // @ts-ignore
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
    await m.reply(`🗂️ La opción *${type}* para ${isAll ? 'todo el bot' : isUser ? 'este usuario' : 'este chat'} fue *${isEnable ? 'activada' : 'desactivada'}* correctamente.`)
    }
})
