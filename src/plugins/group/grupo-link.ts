import {definePlugin} from '../../core/define-plugin.js'
import {replyFailure} from '../../lib/reply-helpers.js'
export default definePlugin({
    help: ['linkgroup'],
    tags: ['group'],
    command: /^link(gro?up)?$/i,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn}) {
    const group = m.chat;
    const code = await conn.groupInviteCode(group).catch(() => null)
    if (!code) return replyFailure(m, 'No se pudo obtener el enlace del grupo.')
    return m.reply('https://chat.whatsapp.com/' + code)
    }
});
;
