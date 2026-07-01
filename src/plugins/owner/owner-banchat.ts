import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {setGroupBanned} from '../../services/group-settings.service.js';

export default defineSdkPlugin({
    help: ['banchat'],
    tags: ['owner'],
    command: /^banchat|ban2|banchat1$/i,
    owner: true,
    async execute(m, {sdk}) {
        await setGroupBanned(m.chat, true);
        await sdk.reply.message('owner.banChat.success');
    },
});
