import {logError} from '../../lib/logger.js';
import {setPrimaryBot} from '../../services/group-settings.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['setprimary'],
    tags: ['jadibot'],
    command: /^setprimary$/i,
    group: true,
    admin: true,
    async execute(m, {conn}) {
    const mentioned = m.mentionedJid?.[0];

    if (!mentioned) {
        try {
            await setPrimaryBot(m.chat, null);
            await m.reply(getRequiredPluginMessage('subbots.primary.cleared'));
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
                text: renderTemplate(getRequiredPluginMessage('subbots.primary.selected'), {bot: selectedId}),
                mentions: [mentioned]
            }, {quoted: m});
            await setPrimaryBot(m.chat, mentioned);
        } catch (err: unknown) {
            logError(err);
        }
    } else {
        await setPrimaryBot(m.chat, botId + "@s.whatsapp.net");
        await m.reply(getRequiredPluginMessage('subbots.primary.selfSelected'));
    }
    }
});
