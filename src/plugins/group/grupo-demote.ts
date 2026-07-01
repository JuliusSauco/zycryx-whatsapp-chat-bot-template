import {defineSdkPlugin} from '../../core/sdk-plugin.js'
export default defineSdkPlugin({
    help: ['*593xxx*', '*@usuario*', '*responder chat*'].map((v) => 'demote ' + v),
    tags: ['group'],
    command: /^(demote|quitarpoder|quitaradmin)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    let number = '';
    if (isNaN(Number(sdk.text)) && !sdk.text.match(/@/g)) {
    } else if (isNaN(Number(sdk.text))) {
        number = sdk.text.split('@')[1];
    } else if (!isNaN(Number(sdk.text))) {
        number = sdk.text;
    }

    if (!sdk.text && !m.quoted) return sdk.reply.message('group.demote.missing');
    if (number.length > 13 || (number.length < 11 && number.length > 0)) return sdk.reply.message('group.demote.invalidNumber');
    let user = '';
    try {
        if (sdk.text) {
            user = number + '@s.whatsapp.net';
        } else if (m.quoted?.sender) {
            user = m.quoted.sender;
        } else if (m.mentionedJid) {
            user = number + '@s.whatsapp.net';
        }
    } catch (e: unknown) {
    } finally {
        if (!user) return sdk.reply.message('group.demote.missingUser');
        await sdk.conn.groupParticipantsUpdate(sdk.chatId, [user], 'demote');
        await sdk.reply.message('group.demote.success');
    }
    }
});
;
