import {definePlugin} from '../../core/define-plugin.js'
import {decrementUserWarn, getUserWarnInfo} from '../../services/user.service.js';
import {replyUserError} from '../../lib/reply-helpers.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['delwarn @user', 'unwarn @user'],
    tags: ['group'],
    command: /^(delwarn|unwarn)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn}) {
    try {
        let who: string;
        if (m.isGroup) {
            who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : '';
        } else {
            who = m.chat;
        }

        if (!who) return replyUserError(m, getRequiredPluginMessage('group.delWarn.missingUser'))
        const user = await getUserWarnInfo(who);
        if (!user) return replyUserError(m, getRequiredPluginMessage('group.delWarn.unknownUser'))
        let warn = user.warn || 0;

        if (warn > 0) {
            await decrementUserWarn(who);
            warn -= 1;
            await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('group.delWarn.success'), {
                user: who.split('@')[0],
                warn,
            }), m)
        } else {
            await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('group.delWarn.empty'), {
                user: who.split('@')[0],
            }), m)
        }
    } catch (err: unknown) {
    }
    }
});

;
