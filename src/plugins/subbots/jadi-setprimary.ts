import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {setPrimaryBot} from '../../services/group-settings.service.js';
import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    help: ['setprimary'],
    tags: ['jadibot'],
    command: /^setprimary$/i,
    group: true,
    admin: true,
    async execute(m, {conn, args, participants, isAdmin, isGroup, command}) {
    const mentioned = m.mentionedJid?.[0];

    if (!mentioned) {
        try {
            await setPrimaryBot(m.chat, null);
            await m.reply("✅ El bot primario ha sido eliminado de este grupo. Ahora cualquier subbot puede responder.");
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
                text: `✅ El bot @${selectedId} ha sido establecido como *BOT PRINCIPAL* de este grupo.`,
                mentions: [mentioned]
            }, {quoted: m});
            await setPrimaryBot(m.chat, mentioned);
        } catch (err: unknown) {
            logError(err);
        }
    } else {
        await setPrimaryBot(m.chat, botId + "@s.whatsapp.net");
        await m.reply("✅ Te has establecido como el bot principal de este grupo.");
    }
    }
});
