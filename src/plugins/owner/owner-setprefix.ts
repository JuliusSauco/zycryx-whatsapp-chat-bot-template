import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {getSubbotConfig, setSubbotPrefix} from '../../services/subbot.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['setprefix'],
    tags: ['jadibot'],
    command: /^setprefix$/i,
    owner: true,
    async execute(m, {args, conn, usedPrefix}) {
        const id = conn.user?.id;
        if (!id) return;
        const cleanId = id.replace(/:\d+/, '');
        const config = await getSubbotConfig(id);
        const actuales = Array.isArray(config.prefix) ? config.prefix : [config.prefix];

        if (args.length === 0) {
            const lista = actuales.length > 0 ? actuales.map(p => `\`${p || getRequiredPluginMessage('owner.prefix.emptyPrefix')}\``).join(", ") : getRequiredPluginMessage('owner.prefix.noPrefix');
            return m.reply(renderTemplate(getRequiredPluginMessage('owner.prefix.current'), {
                prefixes: lista,
                prefix: usedPrefix
            }));
        }

        const entrada = args.join(" ").trim();
        if (entrada.toLowerCase() === "noprefix" || entrada === "0") {
            try {
                await setSubbotPrefix(cleanId, [""]);
                return m.reply(getRequiredPluginMessage('owner.prefix.noPrefixSaved'));
            } catch (err: unknown) {
                logError(err);
                return m.reply(getRequiredPluginMessage('owner.prefix.saveError'));
            }
        }

        const lista = entrada.split(",").map(p => p.trim()).map(p => (p === "0" ? "" : p)).filter((p, i, self) => self.indexOf(p) === i); // evitar duplicados
        if (lista.length === 0) return m.reply(getRequiredPluginMessage('owner.prefix.invalid'));
        if (lista.length > 9) return m.reply(getRequiredPluginMessage('owner.prefix.max'));
        try {
            await setSubbotPrefix(cleanId, lista);
            const nuevoTexto = lista.map(p => `\`${p || getRequiredPluginMessage('owner.prefix.emptyPrefix')}\``).join(", ");
            m.reply(renderTemplate(getRequiredPluginMessage('owner.prefix.updated'), {prefixes: nuevoTexto}));
        } catch (err: unknown) {
            logError(err);
            return m.reply(getRequiredPluginMessage('owner.prefix.reportSaveError'));
        }
    },
});
