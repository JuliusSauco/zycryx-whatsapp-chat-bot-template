import {definePlugin} from '../core/define-plugin.js';

export default definePlugin({
    command: ['promote', 'daradmin', 'darpoder'],
    help: ['promote *593xxx*', 'promote *@usuario*', 'promote *responder chat*'],
    tags: ['group'],
    group: true,
    admin: true,
    botAdmin: true,
    register: true,
    async execute(m, {conn, text}) {
        let number = '';
        if (isNaN(Number(text)) && !text.match(/@/g)) {
            // no-op
        } else if (isNaN(Number(text))) {
            number = text.split('@')[1];
        } else if (!isNaN(Number(text))) {
            number = text;
        }

        if (!text && !m.quoted) return conn.reply(m.chat, `*⚠️ ¿A quien le doy admins?* Etiqueta a una persona no soy adivino :)`, m);
        if (number.length > 13 || (number.length < 11 && number.length > 0)) return conn.reply(m.chat, `*⚠️ Estas drogado ese número ingresado es incorrecto 🤓*, ingresar un número correcto o mejor etiquetas al usuario @tag`, m);

        let user = '';
        try {
            if (text) {
                user = number + '@s.whatsapp.net';
            } else if (m.quoted?.sender) {
                user = m.quoted.sender;
            } else if (m.mentionedJid) {
                user = number + '@s.whatsapp.net';
            }
        } catch {
        }

        await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
        await conn.reply(m.chat, `*[ ✅ ] ÓRDENES RECIBIDAS*`, m);
    }
});
