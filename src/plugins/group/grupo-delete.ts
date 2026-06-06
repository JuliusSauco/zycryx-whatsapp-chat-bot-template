import {logError, logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {proto} from '@whiskeysockets/baileys'

type CachedMessage = {
    key?: proto.IMessageKey
}

export default definePlugin({
    help: ['delete *@user*'],
    tags: ['group'],
    command: /^del(ete)?$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, args}) {

    if (!m.quoted && !m.mentionedJid?.length && !args[0]) return m.reply(`⚠️ Responde al mensaje que quiere eliminar pelotudito.`)
    try {
        if (m.quoted) {
            let delet = m.quoted.sender;
            let bang = m.quoted.id;
            return conn.sendMessage(m.chat, {delete: {remoteJid: m.chat, fromMe: false, id: bang, participant: delet}});
        }

        let target = '';
        if (m.mentionedJid?.length) {
            target = m.mentionedJid[0];
        } else if (args[0] && args[0].startsWith('+')) {
            target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
            return m.reply(`⚠️ Mencionar a alguien o responder a un mensaje.`);
        }

        let chats = conn.chats?.[m.chat]?.messages || {};
        let messagesToDelete = Object.values(chats).filter((msg): msg is CachedMessage => {
            const key = (msg as CachedMessage).key;
            return key?.participant === target || key?.remoteJid === target;
        });

        if (!messagesToDelete.length) return
        let totalToDelete = Math.min(messagesToDelete.length, 200); // Máximo 200 mensajes
        let deletedCount = 0;

        for (let i = 0; i < totalToDelete; i++) {
            let message = messagesToDelete[i];
            try {
                await conn.sendMessage(m.chat, {delete: message.key});
                deletedCount++;
                await delay(100);
            } catch (err: unknown) {
                logInfo(err);
            }
        }
        m.reply(`✅ Se eliminaron ${deletedCount} mensajes de ${target.includes('@s.whatsapp.net')}.`);
    } catch (err: unknown) {
        logError(err);
    }
    }
});

;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
