import {definePlugin} from '../../core/define-plugin.js'
export default definePlugin({
    help: ['linkgroup'],
    tags: ['group'],
    command: /^link(gro?up)?$/i,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, args}) {
    const group = m.chat;
    m.reply('https://chat.whatsapp.com/' + await conn.groupInviteCode(group))
    }
});
;
