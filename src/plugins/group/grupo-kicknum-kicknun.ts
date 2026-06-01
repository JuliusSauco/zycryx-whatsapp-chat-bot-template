import {definePlugin} from '../../core/define-plugin.js'
export default definePlugin({
    help: ['kicknum', 'listnum'],
    tags: ['group'],
    command: /^(kicknum|listanum|listnum)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, { conn, args, participants, usedPrefix, command, isBotAdmin }) {
    if (!args[0]) return m.reply(`*⚠️ Ingresa el prefijo del país, Ejemplo:* ${usedPrefix + command} +52`);
    if (isNaN(Number(args[0]))) return m.reply(`*⚠️ El prefijo debe ser un número válido, Ejemplo:* ${usedPrefix + command} +52`);

    const prefijo = args[0].replace(/[+]/g, '');
    const botJid = conn.user?.id || '';
    const encontrados = participants.map(u => u.id).filter(v => v !== botJid && v.startsWith(prefijo));
    const numeros = encontrados.map(v => '⭔ @' + v.replace(/@.+/, ''));
    if (!encontrados.length) return m.reply(`*📵 No hay ningún número con prefijo +${prefijo} en este grupo.*`);

    switch (command) {
        case 'listanum':
        case 'listnum':
            return conn.reply(m.chat, `*📋 Números encontrados con prefijo +${prefijo}:*\n\n${numeros.join('\n')}`, m, {mentions: encontrados});

        case 'kicknum':
            if (!isBotAdmin) return m.reply('*⚠️ El bot no es administrador, no puedo eliminar usuarios.*');
            await conn.reply(m.chat, `*⚠️ Iniciando eliminación de números con prefijo +${prefijo}...*\n> _Se eliminará uno cada 10 segundos_`, m);
            const ownerGroup = m.chat.split('-')[0] + '@s.whatsapp.net';
            for (const user of encontrados) {
                const error = `@${user.split('@')[0]} ya fue eliminado o abandonó el grupo.`;
                const protegido = [ownerGroup, botJid, global.owner + '@s.whatsapp.net'];

                if (!protegido.includes(user)) {
                    try {
                        const r = await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
                        if (r[0]?.status === '404') await m.reply(error, m.chat, {mentions: [user]});
                    } catch (e: unknown) {
                        await m.reply(`⚠️ No se pudo eliminar a @${user.split('@')[0]}`, m.chat, {mentions: [user]});
                    }
                    await delay(10000);
                }
            }
            return m.reply('*✅ Proceso de eliminación terminado.*');
    }
    }
});
;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
