import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
export default definePlugin({
    help: ['kicknum', 'listnum'],
    tags: ['group'],
    command: /^(kicknum|listanum|listnum)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, { conn, args, participants, usedPrefix, command, isBotAdmin }) {
    if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('group.kickNum.missingPrefix'), {command: usedPrefix + command}));
    if (isNaN(Number(args[0]))) return m.reply(renderTemplate(getRequiredPluginMessage('group.kickNum.invalidPrefix'), {command: usedPrefix + command}));

    const prefijo = args[0].replace(/[+]/g, '');
    const botJid = conn.user?.id || '';
    const encontrados = participants.map(u => u.id).filter(v => v !== botJid && v.startsWith(prefijo));
    const numeros = encontrados.map(v => '⭔ @' + v.replace(/@.+/, ''));
    if (!encontrados.length) return m.reply(renderTemplate(getRequiredPluginMessage('group.kickNum.empty'), {prefix: prefijo}));

    switch (command) {
        case 'listanum':
        case 'listnum':
            return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('group.kickNum.list'), {
                prefix: prefijo,
                numbers: numeros.join('\n'),
            }), m, {mentions: encontrados});

        case 'kicknum':
            if (!isBotAdmin) return m.reply(getRequiredPluginMessage('group.kickNum.botNotAdmin'));
            await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('group.kickNum.start'), {prefix: prefijo}), m);
            const ownerGroup = m.chat.split('-')[0] + '@s.whatsapp.net';
            for (const user of encontrados) {
                const error = renderTemplate(getRequiredPluginMessage('group.kickNum.alreadyGone'), {user: user.split('@')[0]});
                const protegido = [ownerGroup, botJid, global.owner + '@s.whatsapp.net'];

                if (!protegido.includes(user)) {
                    try {
                        const r = await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
                        if (r[0]?.status === '404') await m.reply(error, m.chat, {mentions: [user]});
                    } catch (e: unknown) {
                        await m.reply(renderTemplate(getRequiredPluginMessage('group.kickNum.removeError'), {user: user.split('@')[0]}), m.chat, {mentions: [user]});
                    }
                    await delay(10000);
                }
            }
            return m.reply(getRequiredPluginMessage('group.kickNum.done'));
    }
    }
});
;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
