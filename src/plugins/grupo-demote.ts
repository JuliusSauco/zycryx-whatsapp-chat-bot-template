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
    if (isNaN(Number(text)) && !text.match(/@/g)) {
    } else if (isNaN(Number(text))) {
        number = text.split('@')[1];
    } else if (!isNaN(Number(text))) {
        number = text;
    }

    if (!text && !m.quoted) return conn.reply(m.chat, `*⚠️ ¿A quien le quitó admins?* etiquetas a una persona no soy adivinó :)`, m);
    if (number.length > 13 || (number.length < 11 && number.length > 0)) return conn.reply(m.chat, `*Esta drogado o que ese número ingresado es incorrecto 🤓*, ingresa el número correctamente o mejor etiquetas al usuario.`, m);
    let user = '';
    try {
        if (text) {
            user = number + '@s.whatsapp.net';
        } else if (m.quoted?.sender) {
            user = m.quoted.sender;
        } else if (m.mentionedJid) {
            user = number + '@s.whatsapp.net';
        }
    } catch (e: unknown) {
    } finally {
        if (!user) return m.reply('⚠️ No se pudo resolver el usuario.');
        await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
        conn.reply(m.chat, `*[ ✅ ] ÓRDENES RECIBIDAS*`, m);
    }
    }
});
;
