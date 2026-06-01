import {definePlugin} from '../core/define-plugin.js'
import {listWarnedUsers} from '../services/user.service.js';

const maxwarn = 3
export default definePlugin({
    help: ['listwarn'],
    tags: ['group'],
    command: /^listwarn$/i,
    register: true,
    async execute(m, {conn, participants, metadata}) {
    try {
        const users = await listWarnedUsers();
        const warnedUsers = users.filter(user => participants.some(p => p.id === user.id)).map(user => ({
            id: user.id,
            warn: user.warn
        }));
        warnedUsers.sort((a, b) => b.warn - a.warn);
        let teks = `*📋 LISTA DE ADVERTENCIAS 📋*\n\n`;
        teks += `Grupo: ${metadata.subject || 'Sin nombre'}\n`;
        teks += `Total de usuarios con advertencias: ${warnedUsers.length}\n\n`;

        if (warnedUsers.length === 0) {
            teks += `*¡No hay usuarios con advertencias en este grupo! 😊*`;
        } else {
            teks += `*Usuarios advertidos:*\n`;
            for (let user of warnedUsers) {
                teks += `➥ @${user.id.split('@')[0]} - Advertencias: ${user.warn}/${maxwarn}\n`;
            }
        }
        await conn.reply(m.chat, teks, m)
    } catch (err: unknown) {
        console.error(err);
    }
    }
});

;
