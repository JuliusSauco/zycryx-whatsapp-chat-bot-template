//Código elaborado por: https://github.com/elrebelde21

import {definePlugin} from '../../core/define-plugin.js';
import {createReport} from '../../services/runtime-tasks.service.js';

export default definePlugin({
    help: ["report <texto>", "sugge <sugerencia>"],
    tags: ["main"],
    command: /^(report|request|suggestion|sugge|reporte|bugs?|report-owner|reportes|reportar)$/i,
    register: true,
    async execute(m, {text, usedPrefix, command}) {
    if (!text) return m.reply(`⚠️ Escriba ${command === "suggestion" ? "sugerencias" : "el error/comando con falla"}\n\n*𝐄𝐣:* ${usedPrefix + command} ${command === "suggestion" ? "Agregue un comando de ..." : "los sticker no funka"}`)
    if (text.length < 8) return m.reply(`✨ *𝑴𝒊́𝒏𝒊𝒎𝒐 10 𝒄𝒂𝒓𝒂𝒄𝒕𝒆𝒓𝒆𝒔 𝒑𝒂𝒓𝒂 𝒉𝒂𝒄𝒆𝒓 𝒆𝒍 𝒓𝒆𝒑𝒐𝒓𝒕𝒆...*`)
    if (text.length > 1000) return m.reply(`⚠️ *𝑴𝒂́𝒙𝒊𝒎𝒐 1000 𝑪𝒂𝒓𝒂𝒄𝒕𝒆𝒓𝒆𝒔 𝒑𝒂𝒓𝒂 𝒉𝒂𝒄𝒆𝒓 𝒆𝒍 𝒓𝒆𝒑𝒐𝒓𝒕𝒆.*`)
    const nombre = m.pushName || "sin nombre";
    const tipo = /sugge|suggestion/i.test(command) ? "sugerencia" : "reporte";

    await createReport({
        senderId: m.sender,
        senderName: nombre,
        message: text,
        type: tipo,
    });
    return m.reply(tipo === "sugerencia" ? "✅ ¡Gracias! Tu sugerencia ha sido enviada a nuestro equipo de moderación y será tomada en cuenta." : "✅ Tu reporte ha sido enviado a nuestro equipo de moderación y será revisado pronto.");
    }
});
