import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {decrementUserWarn, getUserWarnInfo} from '../../services/user.service.js';

export default defineSdkPlugin({
    help: ['delwarn @user', 'unwarn @user'],
    tags: ['group'],
    command: /^(delwarn|unwarn)$/i,
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

        if (!who) return sdk.reply.userError(sdk.content.message('group.delWarn.missingUser'))
        const user = await getUserWarnInfo(who);
        if (!user) return sdk.reply.userError(sdk.content.message('group.delWarn.unknownUser'))
        let warn = user.warn || 0;

        if (warn > 0) {
            await decrementUserWarn(who);
            warn -= 1;
            await sdk.reply.message('group.delWarn.success', {
                user: who.split('@')[0],
                warn,
            })
        } else {
            await sdk.reply.message('group.delWarn.empty', {
                user: who.split('@')[0],
            })
        }
    } catch (err: unknown) {
    }
    }
});

;
