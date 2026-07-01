import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getSubbotConfig, setSubbotPrefix} from '../../services/subbot.service.js';

export default defineSdkPlugin({
    help: ['setprefix'],
    tags: ['jadibot'],
    command: /^setprefix$/i,
    owner: true,
    async execute(m, {args, conn, usedPrefix, sdk}) {
        const id = conn.user?.id;
        if (!id) return;
        const cleanId = id.replace(/:\d+/, '');
        const config = await getSubbotConfig(id);
        const actuales = Array.isArray(config.prefix) ? config.prefix : [config.prefix];

        if (args.length === 0) {
            const lista = actuales.length > 0 ? actuales.map(p => `\`${p || sdk.content.message('owner.prefix.emptyPrefix')}\``).join(", ") : sdk.content.message('owner.prefix.noPrefix');
            return sdk.reply.message('owner.prefix.current', {
                prefixes: lista,
                prefix: usedPrefix
            });
        }

        const entrada = args.join(" ").trim();
        if (entrada.toLowerCase() === "noprefix" || entrada === "0") {
            try {
                await setSubbotPrefix(cleanId, [""]);
                return sdk.reply.message('owner.prefix.noPrefixSaved');
            } catch (err: unknown) {
                logError(err);
                return sdk.reply.message('owner.prefix.saveError');
            }
        }

        const lista = entrada.split(",").map(p => p.trim()).map(p => (p === "0" ? "" : p)).filter((p, i, self) => self.indexOf(p) === i); // evitar duplicados
        if (lista.length === 0) return sdk.reply.message('owner.prefix.invalid');
        if (lista.length > 9) return sdk.reply.message('owner.prefix.max');
        try {
            await setSubbotPrefix(cleanId, lista);
            const nuevoTexto = lista.map(p => `\`${p || sdk.content.message('owner.prefix.emptyPrefix')}\``).join(", ");
            await sdk.reply.message('owner.prefix.updated', {prefixes: nuevoTexto});
        } catch (err: unknown) {
            logError(err);
            return sdk.reply.message('owner.prefix.reportSaveError');
        }
    },
});
