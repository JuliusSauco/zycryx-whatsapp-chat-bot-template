import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    command: ['promote', 'daradmin', 'darpoder'],
    help: ['promote *593xxx*', 'promote *@usuario*', 'promote *responder chat*'],
    tags: ['group'],
    group: true,
    admin: true,
    botAdmin: true,
    register: true,
    async execute(m, {sdk}) {
        let number = '';
        if (isNaN(Number(sdk.text)) && !sdk.text.match(/@/g)) {
            // no-op
        } else if (isNaN(Number(sdk.text))) {
            number = sdk.text.split('@')[1];
        } else if (!isNaN(Number(sdk.text))) {
            number = sdk.text;
        }

        if (!sdk.text && !m.quoted) return sdk.reply.message('group.promote.missing');
        if (number.length > 13 || (number.length < 11 && number.length > 0)) return sdk.reply.message('group.promote.invalidNumber');

        let user = '';
        try {
            if (sdk.text) {
                user = number + '@s.whatsapp.net';
            } else if (m.quoted?.sender) {
                user = m.quoted.sender;
            } else if (m.mentionedJid) {
                user = number + '@s.whatsapp.net';
            }
        } catch {
        }

        await sdk.conn.groupParticipantsUpdate(sdk.chatId, [user], 'promote');
        await sdk.reply.message('group.promote.success');
    }
});
