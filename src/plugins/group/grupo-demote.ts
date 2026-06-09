import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage} from '../../lib/message-template.js'
export default definePlugin({
    help: ['*593xxx*', '*@usuario*', '*responder chat*'].map((v) => 'demote ' + v),
    tags: ['group'],
    command: /^(demote|quitarpoder|quitaradmin)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, text}) {
    let number = '';
    if (isNaN(Number(text)) && !text.match(/@/g)) {
    } else if (isNaN(Number(text))) {
        number = text.split('@')[1];
    } else if (!isNaN(Number(text))) {
        number = text;
    }

    if (!text && !m.quoted) return conn.reply(m.chat, getRequiredPluginMessage('group.demote.missing'), m);
    if (number.length > 13 || (number.length < 11 && number.length > 0)) return conn.reply(m.chat, getRequiredPluginMessage('group.demote.invalidNumber'), m);
    let user = '';
    try {
        if (text) {
            user = number + '@s.whatsapp.net';
        } else if (m.quoted?.sender) {
            user = m.quoted.sender;
        } else if (m.mentionedJid) {
            user = number + '@s.whatsapp.net';
        }
    } catch (e: unknown) {
    } finally {
        if (!user) return m.reply(getRequiredPluginMessage('group.demote.missingUser'));
        await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
        conn.reply(m.chat, getRequiredPluginMessage('group.demote.success'), m);
    }
    }
});
;
