import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    command: ['mylid'],
    help: ['mylid'],
    tags: ['tools'],
    async execute(m, {sdk}) {
        const USER_ID = m.user.lid;
        await sdk.conn.fakeReply(sdk.chatId, USER_ID, '0@s.whatsapp.net', sdk.content.message('tools.id.quoted'), 'status@broadcast');
    }
});
