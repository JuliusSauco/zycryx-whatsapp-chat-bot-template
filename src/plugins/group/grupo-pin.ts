import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
export default defineSdkPlugin({
    help: ['pin'],
    tags: ['group'],
    command: ['pin', 'unpin', 'destacar', 'desmarcar'],
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    if (!m.quoted) return sdk.reply.message('group.pin.missingQuoted', {
        action: sdk.command === 'pin'
            ? sdk.content.message('group.pin.actionPin')
            : sdk.content.message('group.pin.actionUnpin'),
    });
    try {
        let messageKey = {
            remoteJid: m.chat,
            fromMe: m.quoted.fromMe,
            id: m.quoted.id,
            participant: m.quoted.sender
        };

        if (sdk.command === 'pin') {
            await sdk.conn.sendMessage(sdk.chatId, {pin: messageKey, type: 1, time: 604800})
            await sdk.reply.react("✅️")
        }

        if (sdk.command === 'unpin') {
            await sdk.conn.sendMessage(sdk.chatId, {pin: messageKey, type: 2, time: 86400})
            await sdk.reply.react("✅️")
        }

        if (sdk.command === 'destacar') {
            await sdk.conn.sendMessage(sdk.chatId, {keep: messageKey, type: 1, time: 15552000})
            await sdk.reply.react("✅️")
        }

        if (sdk.command === 'desmarcar') {
            await sdk.conn.sendMessage(sdk.chatId, {keep: messageKey, type: 2, time: 86400})
            await sdk.reply.react("✅️")
        }
    } catch (error: unknown) {
        logError(error);
    }
    }
});
