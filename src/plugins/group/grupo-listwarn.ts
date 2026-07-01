import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {listWarnedUsers} from '../../services/user.service.js';

const maxwarn = 3
export default defineSdkPlugin({
    help: ['listwarn'],
    tags: ['group'],
    command: /^listwarn$/i,
    register: true,
    async execute(m, {sdk}) {
    try {
        const users = await listWarnedUsers();
        const warnedUsers = users.filter(user => sdk.participants.some(p => p.id === user.id)).map(user => ({
            id: user.id,
            warn: user.warn
        }));
        warnedUsers.sort((a, b) => b.warn - a.warn);
        let teks = sdk.content.renderMessage('group.listWarn.header', {
            group: sdk.metadata.subject || sdk.content.message('group.listWarn.unknownGroup'),
            total: warnedUsers.length,
        });

        if (warnedUsers.length === 0) {
            teks += sdk.content.message('group.listWarn.empty');
        } else {
            teks += sdk.content.message('group.listWarn.listTitle');
            for (let user of warnedUsers) {
                teks += sdk.content.renderMessage('group.listWarn.item', {
                    user: user.id.split('@')[0],
                    warn: user.warn,
                    maxwarn,
                });
            }
        }
        await sdk.reply.text(teks)
    } catch (err: unknown) {
        logError(err);
    }
    }
});

;
