import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    command: ['mylid'],
    help: ['mylid'],
    tags: ['tools'],
    async execute(m, {conn}) {
        const USER_ID = m.user.lid;
        await conn.fakeReply(m.chat, USER_ID, '0@s.whatsapp.net', `👇 AQUI ESTA TU NUMERO OCULTO "LID" 👇`, 'status@broadcast');
    }
});
