import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {ENV} from '../../core/env.js';
import {httpJson} from '../../lib/http-client.js';
import {replyFailure, replyUsage} from '../../lib/reply-helpers.js';

interface TranslateResponse {
    translatedText?: string;
}

export default definePlugin({
    help: ['traducir', 'translate'],
    tags: ['tools'],
    command: /^(translate|traducir|trad)$/i,
    register: true,
    async execute(m, {args, usedPrefix, command}) {
    const defaultLang = 'es';
    if (!args || !args[0]) return replyUsage(m, `${usedPrefix + command} (idioma destino) (texto a traducir)`, `📌 *Ejemplos:*
• ${usedPrefix + command} es Hello » Español
• ${usedPrefix + command} en hola » inglés
• ${usedPrefix + command} fr buenos días » Francés
• ${usedPrefix + command} pt tudo bem » Portugués
• ${usedPrefix + command} de cómo estás » Alemán
• ${usedPrefix + command} it buongiorno » Italiano`);

    let lang = args[0];
    let text = args.slice(1).join(' ');

    if ((lang || '').length !== 2) {
        text = args.join(' ');
        lang = defaultLang;
    }

    if (!text && m.quoted && m.quoted.text) text = m.quoted.text;

    if (!text) return replyUsage(m, `${usedPrefix + command} es Hello`);

    try {
        const json = await httpJson<TranslateResponse>("https://tr.skyultraplus.com/translate", {
            method: "POST",
            body: JSON.stringify({
                q: text,
                source: "auto",
                target: lang,
                format: "text",
                alternatives: 3,
                api_key: ENV.TRANSLATE_API_KEY
            }),
            headers: {"Content-Type": "application/json"}
        });

        if (!json || !json.translatedText) throw '❌ No se pudo traducir.';

        await m.reply(`*Traducción:*\n${json.translatedText}`);
    } catch (e: unknown) {
        logError(e);
        await replyFailure(m, 'Error al traducir. Vuelve a intentarlo.');
    }
    }
});
