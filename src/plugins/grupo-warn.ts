import {definePlugin} from '../core/define-plugin.js'
import {getUserWarnInfo, incrementUserWarn, resetUserWarn} from '../services/user.service.js';

const maxwarn = 3;

export default definePlugin({
    help: ['warn @user [razón]'],
    tags: ['group'],
    command: /^warn$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, text, args, usedPrefix, command, metadata}) {
    try {
        let who: string;
        if (m.isGroup) {
            who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : '';
        } else {
            who = m.chat;
        }

        if (!who) return m.reply(`*¿A quién le doy una advertencia?* Etiqueta a la persona con @tag o cita su mensaje.`)
        const user = await getUserWarnInfo(who);
        if (!user) return m.reply(`*⚠️ ¿Quién carajo es ese?* No aparece en mi base de datos.`)

        const name = (await conn.getName(m.sender)) || m.sender.split('@')[0];
        let warn = user.warn || 0;

        if (warn < maxwarn) {
            await incrementUserWarn(who);
            warn += 1;

            let reason = text.trim() || 'No especificada';
            await conn.reply(m.chat, `*⚠️ ADVERTENCIA ⚠️*\n\n@${who.split('@')[0]} fuiste advertido por el admin: ${name}\n*• Tiene:* ${warn}/${maxwarn} advertencias\n*• Razón:* ${reason}`, m)
        } else if (warn >= maxwarn) {
            await resetUserWarn(who);
            await conn.reply(m.chat, `⚠️ El usuario @${who.split('@')[0]} superó las *${maxwarn}* advertencias y será eliminado del grupo...`, m)
            await delay(3000);
            await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
        }
    } catch (err: any) {
        console.error(err);
    }
    }
});

;
const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
