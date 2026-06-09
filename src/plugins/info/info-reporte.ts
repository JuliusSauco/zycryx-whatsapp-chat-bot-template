//Código elaborado por: https://github.com/elrebelde21

import {createReport} from '../../services/runtime-tasks.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    help: ["report <texto>", "sugge <sugerencia>"],
    tags: ["main"],
    command: /^(report|request|suggestion|sugge|reporte|bugs?|report-owner|reportes|reportar)$/i,
    register: true,
    async execute(m, {sdk}) {
    const isSuggestion = sdk.command === "suggestion";
    if (!sdk.text) return sdk.reply.message('info.report.missing', {
        subject: isSuggestion ? 'sugerencias' : 'el error/comando con falla',
        exampleCommand: sdk.usedPrefix + sdk.command,
        exampleText: isSuggestion ? 'Agregue un comando de ...' : 'los sticker no funka',
    })
    if (sdk.text.length < 8) return sdk.reply.message('info.report.minLength')
    if (sdk.text.length > 1000) return sdk.reply.message('info.report.maxLength')
    const nombre = m.pushName || "sin nombre";
    const tipo = /sugge|suggestion/i.test(sdk.command) ? "sugerencia" : "reporte";

    await createReport({
        senderId: sdk.sender,
        senderName: nombre,
        message: sdk.text,
        type: tipo,
    });
    return sdk.reply.message(tipo === "sugerencia" ? 'info.report.suggestionSent' : 'info.report.reportSent');
    }
});
