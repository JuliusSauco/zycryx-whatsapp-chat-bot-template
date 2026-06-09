import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {ENV} from '../../core/env.js';

interface TranslateResponse {
    translatedText?: string;
}

export default defineSdkPlugin({
    help: ['traducir', 'translate'],
    tags: ['tools'],
    command: /^(translate|traducir|trad)$/i,
    register: true,
    async execute(m, {sdk}) {
    const args = sdk.args;
    const defaultLang = 'es';
    const commandLabel = sdk.usedPrefix + sdk.command;
    if (!args || !args[0]) return sdk.reply.usage(
        sdk.content.renderMessage('tools.translate.usage', {command: commandLabel}),
        sdk.content.renderMessage('tools.translate.examples', {command: commandLabel}),
    );

    let lang = args[0];
    let text = args.slice(1).join(' ');

    if ((lang || '').length !== 2) {
        text = args.join(' ');
        lang = defaultLang;
    }

    if (!text && m.quoted && m.quoted.text) text = m.quoted.text;

    if (!text) return sdk.reply.usage(sdk.content.renderMessage('tools.translate.usageQuoted', {command: commandLabel}));

    try {
        const json = await sdk.http.json<TranslateResponse>("https://tr.skyultraplus.com/translate", {
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

        if (!json || !json.translatedText) throw sdk.content.message('tools.translate.noResult');

        await sdk.reply.message('tools.translate.result', {translation: json.translatedText});
    } catch (e: unknown) {
        logError(e);
        await sdk.reply.failure(sdk.content.message('tools.translate.failure'));
    }
    }
});
