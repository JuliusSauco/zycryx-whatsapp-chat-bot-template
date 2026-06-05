import {definePlugin} from '../../core/define-plugin.js'
import {decrementUserWarn, getUserWarnInfo} from '../../services/user.service.js';
import {replyUserError} from '../../lib/reply-helpers.js';

export default definePlugin({
    help: ['delwarn @user', 'unwarn @user'],
    tags: ['group'],
    command: /^(delwarn|unwarn)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, args, usedPrefix, command, metadata}) {
    try {
        let who: string;
        if (m.isGroup) {
            who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : '';
        } else {
            who = m.chat;
        }

        if (!who) return replyUserError(m, `*¿A quién le quito una advertencia?* Etiqueta a una persona con @tag o cita su mensaje.`)
        const user = await getUserWarnInfo(who);
        if (!user) return replyUserError(m, `No encontré al usuario para quitarle una advertencia.`)
        let warn = user.warn || 0;

        if (warn > 0) {
            await decrementUserWarn(who);
            warn -= 1;
            await conn.reply(m.chat, `*⚠️ SE QUITÓ UNA ADVERTENCIA ⚠️*\n\nUsuario: @${who.split('@')[0]}\n*• Advertencia:* -1\n*• Total:* ${warn}`, m)
        } else {
            await conn.reply(m.chat, `*⚠️ El usuario @${who.split('@')[0]} no tiene ninguna advertencia.*`, m)
        }
    } catch (err: unknown) {
    }
    }
});

;
