import {logError} from '../../lib/logger.js';
import {setPrimaryBot} from '../../services/group-settings.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {requireBotInstanceIdentity} from '../../core/bot-instance-identity.js';
import {findBotInstanceIdByJid} from '../../services/subbot.service.js';
import {cleanJid} from '../../utils/jid.js';

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

    const identity = requireBotInstanceIdentity(conn);
    const selectedJid = cleanJid(mentioned);
    const selectedInstanceId = selectedJid === identity.botJid
        ? identity.instanceId
        : await findBotInstanceIdByJid(selectedJid);

    if (!selectedInstanceId) {
        await m.reply('No se encontró una instancia activa asociada al bot mencionado.');
        return;
    }

    if (selectedInstanceId !== identity.instanceId) {
        try {
            await conn.sendMessage(m.chat, {
                text: sdk.content.renderMessage('subbots.primary.selected', {bot: selectedJid.split('@')[0]}),
                mentions: [mentioned]
            }, {quoted: m});
            await setPrimaryBot(m.chat, selectedInstanceId);
        } catch (err: unknown) {
            logError(err);
        }
    } else {
        await setPrimaryBot(m.chat, identity.instanceId);
        await sdk.reply.message('subbots.primary.selfSelected');
    }
    }
});
