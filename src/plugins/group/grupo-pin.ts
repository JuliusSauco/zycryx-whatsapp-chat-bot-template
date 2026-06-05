import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
export default definePlugin({
    help: ['pin'],
    tags: ['group'],
    command: ['pin', 'unpin', 'destacar', 'desmarcar'],
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, command}) {
    if (!m.quoted) return m.reply(`⚠️ Responde a un mensaje para ${command === 'pin' ? 'fijarlo' : 'desfijarlo'}.`);
    try {
        let messageKey = {
            remoteJid: m.chat,
            fromMe: m.quoted.fromMe,
            id: m.quoted.id,
            participant: m.quoted.sender
        };

        if (command === 'pin') {
            await conn.sendMessage(m.chat, {pin: messageKey, type: 1, time: 604800})
//conn.sendMessage(m.chat, {pin: {type: 1, time: 604800, key: messageKey }});
            m.react("✅️")
        }

        if (command === 'unpin') {
            await conn.sendMessage(m.chat, {pin: messageKey, type: 2, time: 86400})
//conn.sendMessage(m.chat, { pin: { type: 0, key: messageKey }});
            m.react("✅️")
        }

        if (command === 'destacar') {
            await conn.sendMessage(m.chat, {keep: messageKey, type: 1, time: 15552000})
            m.react("✅️")
        }

        if (command === 'desmarcar') {
            await conn.sendMessage(m.chat, {keep: messageKey, type: 2, time: 86400})
            m.react("✅️")
        }
    } catch (error: unknown) {
        logError(error);
    }
    }
});
