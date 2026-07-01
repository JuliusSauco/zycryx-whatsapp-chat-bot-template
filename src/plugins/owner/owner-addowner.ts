import {logError, logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getSubbotConfig, setSubbotOwners} from '../../services/subbot.service.js';

export default defineSdkPlugin({
    help: ["addowner", "delowner"],
    tags: ["jadibot"],
    command: /^(addowner|delowner)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, args, command, usedPrefix, sdk}) {
        const id = conn.user?.id;
        if (!id) return
        const botId = id.replace(/:\d+/, '');
        let jidToSave = m.mentionedJid?.[0];
        if (!jidToSave && args[0]) {
            const input = args[0].replace(/^\+/, '').replace(/[^0-9]/g, '');
            if (input.length >= 7) jidToSave = `${input}@s.whatsapp.net`;
        }
        if (!jidToSave) return sdk.reply.message('owner.owners.missingTarget', {
            command: usedPrefix + command,
            sender: m.sender,
        });

        const display = jidToSave.replace(/@.+/, '');
        const config = await getSubbotConfig(botId);
        if (!Array.isArray(config.owners)) config.owners = [];
        try {
            if (command === "addowner") {
                if (config.owners.includes(jidToSave)) return sdk.reply.message('owner.owners.alreadyOwner', {user: display}, null, {mentions: [jidToSave]});
                config.owners.push(jidToSave);
                await setSubbotOwners(botId, config.owners);
                logInfo(`✅ Owner agregado: ${jidToSave} para ID ${botId}`);
                return sdk.reply.message('owner.owners.added', {user: display}, null, {mentions: [jidToSave]});
            }

            if (command === "delowner") {
                if (!config.owners.includes(jidToSave)) return sdk.reply.message('owner.owners.notOwner', {user: display}, null, {mentions: [jidToSave]});
                config.owners = config.owners.filter(j => j !== jidToSave);
                await setSubbotOwners(botId, config.owners);
                logInfo(`✅ Owner removido: ${jidToSave} para ID ${botId}`);
                return sdk.reply.message('owner.owners.removed', {user: display}, null, {mentions: [jidToSave]});
            }
        } catch (err: unknown) {
            logError(err);
        }
    }
});
