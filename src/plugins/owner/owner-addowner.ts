import {logError, logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {getSubbotConfig, setSubbotOwners} from '../../services/subbot.service.js';

export default definePlugin({
    help: ["addowner", "delowner"],
    tags: ["jadibot"],
    command: /^(addowner|delowner)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, args, command, usedPrefix}) {
        const id = conn.user?.id;
        if (!id) return
        const botId = id.replace(/:\d+/, '');
        let jidToSave = m.mentionedJid?.[0];
        if (!jidToSave && args[0]) {
            const input = args[0].replace(/^\+/, '').replace(/[^0-9]/g, '');
            if (input.length >= 7) jidToSave = `${input}@s.whatsapp.net`;
        }
        if (!jidToSave) return m.reply(`❌ Debes etiquetar a alguien o escribir un número válido.\nEjemplo: ${usedPrefix + command} +522257888 o ${usedPrefix + command} @${m.sender}`);

        const display = jidToSave.replace(/@.+/, '');
        const config = await getSubbotConfig(botId);
        if (!Array.isArray(config.owners)) config.owners = [];
        try {
            if (command === "addowner") {
                if (config.owners.includes(jidToSave)) return m.reply(`⚠️ @${display} ya es owner.`, {mentions: [jidToSave]});
                config.owners.push(jidToSave);
                await setSubbotOwners(botId, config.owners);
                logInfo(`✅ Owner agregado: ${jidToSave} para ID ${botId}`);
                return m.reply(`✅ Agregado como owner: @${display}`, {mentions: [jidToSave]});
            }

            if (command === "delowner") {
                if (!config.owners.includes(jidToSave)) return m.reply(`⚠️ @${display} no es owner.`, {mentions: [jidToSave]});
                config.owners = config.owners.filter(j => j !== jidToSave);
                await setSubbotOwners(botId, config.owners);
                logInfo(`✅ Owner removido: ${jidToSave} para ID ${botId}`);
                return m.reply(`✅ Removido como owner: @${display}`, {mentions: [jidToSave]});
            }
        } catch (err: unknown) {
            logError(err);
        }
    }
});
