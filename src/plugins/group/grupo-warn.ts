import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {getUserWarnInfo, incrementUserWarn, resetUserWarn} from '../../services/user.service.js';

const maxwarn = 3;

export default defineSdkPlugin({
    help: ['warn @user [razón]'],
    tags: ['group'],
    command: /^warn$/i,
    admin: true,
    botAdmin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    try {
        let who: string;
        if (m.isGroup) {
            who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : '';
        } else {
            who = m.chat;
        }

        if (!who) return sdk.reply.message('group.warn.missingUser')
        const user = await getUserWarnInfo(who);
        if (!user) return sdk.reply.message('group.warn.unknownUser')

        const name = (await sdk.conn.getName(sdk.sender)) || sdk.sender.split('@')[0];
        let warn = user.warn || 0;

        if (warn < maxwarn) {
            await incrementUserWarn(who);
            warn += 1;

            let reason = sdk.text.trim() || sdk.content.message('group.warn.defaultReason');
            await sdk.reply.message('group.warn.notice', {
                user: who.split('@')[0],
                admin: name,
                warn,
                maxwarn,
                reason,
            })
        } else if (warn >= maxwarn) {
            await resetUserWarn(who);
            await sdk.reply.message('group.warn.kickNotice', {
                user: who.split('@')[0],
                maxwarn,
            })
            await delay(3000);
            await sdk.conn.groupParticipantsUpdate(sdk.chatId, [who], 'remove');
        }
    } catch (err: unknown) {
        logError(err);
    }
    }
});

;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
