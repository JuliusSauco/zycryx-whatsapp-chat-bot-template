import {definePlugin} from '../../core/define-plugin.js';
import {setGroupBanned} from '../../services/group-settings.service.js';
import {getRequiredPluginMessage} from '../../lib/message-template.js';

export default definePlugin({
    help: ['unbanchat'],
    tags: ['owner'],
    command: /^unbanchat$/i,
    owner: true,
    async execute(m) {
        await setGroupBanned(m.chat, false);

        m.reply(getRequiredPluginMessage('owner.unbanChat.success'));
    },
});
