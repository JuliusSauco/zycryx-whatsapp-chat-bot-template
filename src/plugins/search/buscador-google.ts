import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {logInfo} from '../../lib/logger.js';
import {searchGoogle} from '../../providers/main-api.provider.js';

export default defineSdkPlugin({
    help: ['google', 'googlef'].map(value => `${value} <pencarian>`),
    tags: ['buscadores'],
    command: /^googlef?$/i,
    register: true,
    limit: 1,
    async execute(_m, {sdk}) {
        if (!sdk.text) return sdk.reply.message('search.google.missingQuery', {command: sdk.usedPrefix + sdk.command});
        await sdk.reply.react('⌛');
        try {
            const results = await searchGoogle(sdk.text);
            let text = sdk.content.renderMessage('search.google.primaryHeader', {query: sdk.text});
            for (const result of results) {
                text += sdk.content.renderMessage('search.google.primaryItem', {
                    title: result.title || '',
                    url: result.formattedUrl || result.url || '',
                    description: result.snippet || result.description || '',
                });
            }
            const screenshot = `https://image.thum.io/get/fullpage/https://google.com/search?q=${encodeURIComponent(sdk.text)}`;
            await sdk.sendFile(screenshot, 'result.png', text);
            await sdk.reply.react('✅');
        } catch (error) {
            logInfo(error);
            await sdk.reply.react('❌');
            await sdk.reply.reportableError(error);
        }
    },
});
