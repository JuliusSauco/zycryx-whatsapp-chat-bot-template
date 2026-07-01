import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {getGroupParticipantRole} from '../../services/group-role.service.js'
export default defineSdkPlugin({
    help: ['staff'],
    tags: ['group'],
    command: ['staff', 'admins', 'listadmin'],
    group: true,
    register: true,
    async execute(m, {sdk}) {
    try {
        const admins = sdk.metadata.participants.filter(p => p.admin)
        if (!admins.length) return sdk.reply.message('group.staff.emptyAdmins')

        const users = admins.map(p => p.phoneNumber || p.id)
        const total = users.length
        await sdk.reply.react("📣")

        const roles = await Promise.all(admins.map(admin => getGroupParticipantRole(sdk.chatId, admin)))
        const adminList = users.map((u, index) => sdk.content.renderMessage('group.staff.item', {
            user: u.replace(/@s\.whatsapp\.net|@lid/g, "").replace(/[^0-9]/g, ""),
            roleLine: roles[index]?.role ? sdk.content.renderMessage('group.roles.roleLine', {role: roles[index].role}) : '',
        })).join(" \n ")
        const cleanText = (sdk.text || '').trim()
        const mensaje = sdk.content.renderMessage('group.staff.message', {
            message: cleanText || sdk.content.message('group.staff.defaultMessage'),
            total,
            admins: adminList,
        })

        await sdk.sendMessage({
            text: mensaje,
            mentions: users
        })
    } catch (e: unknown) {
        logError("❌ Error en /admins:", e)
    }
    }
})

