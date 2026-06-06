import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {getSubbotConfig, setSubbotPrefix} from '../../services/subbot.service.js';

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
            const lista = actuales.length > 0 ? actuales.map(p => `\`${p || '(sin prefijo)'}\``).join(", ") : "Sin prefijo";
            return m.reply(`📌 *Prefijos actuales:* ${lista}

✏️ *Ejemplos de uso:*
• \`${usedPrefix}setprefix /\` _(solo responde a “/”)_
• \`${usedPrefix}setprefix 0\` _(sin prefijo)_
• \`${usedPrefix}setprefix 0,#,!\` _(sin prefijo, # y !)_`);
        }

        const entrada = args.join(" ").trim();
        if (entrada.toLowerCase() === "noprefix" || entrada === "0") {
            try {
                await setSubbotPrefix(cleanId, [""]);
                return m.reply(`✅ Ahora el bot funciona *sin prefijo*. Puedes escribir comandos directamente como:\n• \`menu\``);
            } catch (err: unknown) {
                logError(err);
                return m.reply("❌ Error al guardar prefijos, revisa la base de datos.");
            }
        }

        const lista = entrada.split(",").map(p => p.trim()).map(p => (p === "0" ? "" : p)).filter((p, i, self) => self.indexOf(p) === i); // evitar duplicados
        if (lista.length === 0) return m.reply("❌ No se detectaron prefijos válidos.");
        if (lista.length > 9) return m.reply("⚠️ Máximo 9 prefijos permitidos.");
        try {
            await setSubbotPrefix(cleanId, lista);
            const nuevoTexto = lista.map(p => `\`${p || '(sin prefijo)'}\``).join(", ");
            m.reply(`✅ Prefijos actualizados a: ${nuevoTexto}`);
        } catch (err: unknown) {
            logError(err);
            return m.reply("❌ Error al guardar prefijos, revisa la base de datos, reportarlo a mi creator con el comando: /report");
        }
    },
});
