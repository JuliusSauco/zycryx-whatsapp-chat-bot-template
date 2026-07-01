import {logError} from '../../lib/logger.js';
import {setPrimaryBot} from '../../services/group-settings.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    help: ['setprimary'],
    tags: ['jadibot'],
    command: /^setprimary$/i,
    group: true,
    admin: true,
    async execute(m, {conn, sdk}) {
    const mentioned = m.mentionedJid?.[0];

    if (!mentioned) {
        try {
            await setPrimaryBot(m.chat, null);
            await sdk.reply.message('subbots.primary.cleared');
        } catch (err: unknown) {
            logError(err);
        }
        return;
    }

    const botId = conn.user?.id.replace(/:\d+/, "");
    const selectedId = mentioned.replace(/:\d+/, "").replace("@s.whatsapp.net", "");

    if (selectedId !== botId) {
        try {
            await conn.sendMessage(m.chat, {
                text: sdk.content.renderMessage('subbots.primary.selected', {bot: selectedId}),
                mentions: [mentioned]
            }, {quoted: m});
            await setPrimaryBot(m.chat, mentioned);
        } catch (err: unknown) {
            logError(err);
        }
    } else {
        await setPrimaryBot(m.chat, botId + "@s.whatsapp.net");
        await sdk.reply.message('subbots.primary.selfSelected');
    }
    }
});
