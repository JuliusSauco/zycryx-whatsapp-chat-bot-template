import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {getGroupParticipantRole} from '../../services/group-role.service.js'
export default definePlugin({
    help: ['staff'],
    tags: ['group'],
    command: ['staff', 'admins', 'listadmin'],
    group: true,
    register: true,
    async execute(m, {conn, text, metadata}) {
    try {
        const admins = metadata.participants.filter(p => p.admin)
        if (!admins.length) return m.reply(getRequiredPluginMessage('group.staff.emptyAdmins'))

        const users = admins.map(p => p.phoneNumber || p.id)
        const total = users.length
        await m.react("📣")

        const roles = await Promise.all(admins.map(admin => getGroupParticipantRole(m.chat, admin)))
        const adminList = users.map((u, index) => renderTemplate(getRequiredPluginMessage('group.staff.item'), {
            user: u.replace(/@s\.whatsapp\.net|@lid/g, "").replace(/[^0-9]/g, ""),
            roleLine: roles[index]?.role ? renderTemplate(getRequiredPluginMessage('group.roles.roleLine'), {role: roles[index].role}) : '',
        })).join(" \n ")
        const cleanText = (text || '').trim()
        const mensaje = renderTemplate(getRequiredPluginMessage('group.staff.message'), {
            message: cleanText || getRequiredPluginMessage('group.staff.defaultMessage'),
            total,
            admins: adminList,
        })

        await conn.sendMessage(m.chat, {
            text: mensaje,
            mentions: users
        }, {quoted: m})
    } catch (e: unknown) {
        logError("❌ Error en /admins:", e)
    }
    }
})

