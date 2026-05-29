import {definePlugin} from '../core/define-plugin.js'
export default definePlugin({
    help: ['*593xxx*', '*@usuario*', '*responder chat*'].map((v) => 'demote ' + v),
    tags: ['group'],
    command: /^(demote|quitarpoder|quitaradmin)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, usedPrefix, text}) {
    let number = '';
    if (isNaN(text as any) && !text.match(/@/g)) {
    } else if (isNaN(text as any)) {
        number = text.split('@')[1];
    } else if (!isNaN(text as any)) {
        number = text;
    }

    if (!text && !m.quoted) return conn.reply(m.chat, `*⚠️ ¿A quien le quitó admins?* etiquetas a una persona no soy adivinó :)`, m);
    if (number.length > 13 || (number.length < 11 && number.length > 0)) return conn.reply(m.chat, `*Esta drogado o que ese número ingresado es incorrecto 🤓*, ingresa el número correctamente o mejor etiquetas al usuario.`, m);
    try {
        if (text) {
            var user = number + '@s.whatsapp.net';
        } else if (m.quoted?.sender) {
            // @ts-ignore
            var user = m.quoted.sender;
        } else if (m.mentionedJid) {
            var user = number + '@s.whatsapp.net';
        }
    } catch (e: any) {
    } finally {
        // @ts-ignore
        conn.groupParticipantsUpdate(m.chat, [user], 'demote');
        conn.reply(m.chat, `*[ ✅ ] ÓRDENES RECIBIDAS*`, m);
    }
    }
});
;
