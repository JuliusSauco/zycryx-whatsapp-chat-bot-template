import {logError, logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import type {proto} from '@whiskeysockets/baileys'

type CachedMessage = {
    key?: proto.IMessageKey
}

export default defineSdkPlugin({
    help: ['delete *@user*'],
    tags: ['group'],
    command: /^del(ete)?$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {

    if (!m.quoted && !m.mentionedJid?.length && !sdk.args[0]) return sdk.reply.message('group.delete.missingTarget')
    try {
        if (m.quoted) {
            let delet = m.quoted.sender;
            let bang = m.quoted.id;
            return sdk.conn.sendMessage(sdk.chatId, {delete: {remoteJid: sdk.chatId, fromMe: false, id: bang, participant: delet}});
        }

        let target = '';
        if (m.mentionedJid?.length) {
            target = m.mentionedJid[0];
        } else if (sdk.args[0] && sdk.args[0].startsWith('+')) {
            target = sdk.args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
            return sdk.reply.message('group.delete.missingMention');
        }

        let chats = sdk.conn.chats?.[sdk.chatId]?.messages || {};
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
                await sdk.conn.sendMessage(sdk.chatId, {delete: message.key});
                deletedCount++;
                await delay(100);
            } catch (err: unknown) {
                logInfo(err);
            }
        }
        await sdk.reply.message('group.delete.success', {
            count: deletedCount,
            target: target.includes('@s.whatsapp.net'),
        });
    } catch (err: unknown) {
        logError(err);
    }
    }
});

;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
