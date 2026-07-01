import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {setGroupBanned} from '../../services/group-settings.service.js';

export default defineSdkPlugin({
    help: ['unbanchat'],
    tags: ['owner'],
    command: /^unbanchat$/i,
    owner: true,
    async execute(m, {sdk}) {
        await setGroupBanned(m.chat, false);

        await sdk.reply.message('owner.unbanChat.success');
    },
});
