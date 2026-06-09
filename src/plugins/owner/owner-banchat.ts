import {definePlugin} from '../../core/define-plugin.js';
import {setGroupBanned} from '../../services/group-settings.service.js';
import {getRequiredPluginMessage} from '../../lib/message-template.js';

export default definePlugin({
    help: ['banchat'],
    tags: ['owner'],
    command: /^banchat|ban2|banchat1$/i,
    owner: true,
    async execute(m) {
        await setGroupBanned(m.chat, true);
        m.reply(getRequiredPluginMessage('owner.banChat.success'));
    },
});
