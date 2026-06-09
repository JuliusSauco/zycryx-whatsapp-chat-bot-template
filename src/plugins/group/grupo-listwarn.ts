import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {listWarnedUsers} from '../../services/user.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

const maxwarn = 3
export default definePlugin({
    help: ['listwarn'],
    tags: ['group'],
    command: /^listwarn$/i,
    register: true,
    async execute(m, {conn, participants, metadata}) {
    try {
        const users = await listWarnedUsers();
        const warnedUsers = users.filter(user => participants.some(p => p.id === user.id)).map(user => ({
            id: user.id,
            warn: user.warn
        }));
        warnedUsers.sort((a, b) => b.warn - a.warn);
        let teks = renderTemplate(getRequiredPluginMessage('group.listWarn.header'), {
            group: metadata.subject || getRequiredPluginMessage('group.listWarn.unknownGroup'),
            total: warnedUsers.length,
        });

        if (warnedUsers.length === 0) {
            teks += getRequiredPluginMessage('group.listWarn.empty');
        } else {
            teks += getRequiredPluginMessage('group.listWarn.listTitle');
            for (let user of warnedUsers) {
                teks += renderTemplate(getRequiredPluginMessage('group.listWarn.item'), {
                    user: user.id.split('@')[0],
                    warn: user.warn,
                    maxwarn,
                });
            }
        }
        await conn.reply(m.chat, teks, m)
    } catch (err: unknown) {
        logError(err);
    }
    }
});

;
