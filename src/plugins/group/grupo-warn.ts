import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {getUserWarnInfo, incrementUserWarn, resetUserWarn} from '../../services/user.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

const maxwarn = 3;

export default definePlugin({
    help: ['warn @user [razón]'],
    tags: ['group'],
    command: /^warn$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {conn, text}) {
    try {
        let who: string;
        if (m.isGroup) {
            who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : '';
        } else {
            who = m.chat;
        }

        if (!who) return m.reply(getRequiredPluginMessage('group.warn.missingUser'))
        const user = await getUserWarnInfo(who);
        if (!user) return m.reply(getRequiredPluginMessage('group.warn.unknownUser'))

        const name = (await conn.getName(m.sender)) || m.sender.split('@')[0];
        let warn = user.warn || 0;

        if (warn < maxwarn) {
            await incrementUserWarn(who);
            warn += 1;

            let reason = text.trim() || getRequiredPluginMessage('group.warn.defaultReason');
            await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('group.warn.notice'), {
                user: who.split('@')[0],
                admin: name,
                warn,
                maxwarn,
                reason,
            }), m)
        } else if (warn >= maxwarn) {
            await resetUserWarn(who);
            await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('group.warn.kickNotice'), {
                user: who.split('@')[0],
                maxwarn,
            }), m)
            await delay(3000);
            await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
        }
    } catch (err: unknown) {
        logError(err);
    }
    }
});

;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
