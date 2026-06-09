import {logInfo} from '../../lib/logger.js';
//import {googleIt} from '@bochilteam/scraper';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {ENV} from '../../core/env.js';

interface GoogleSearchResult {
    title?: string;
    url?: string;
    formattedUrl?: string;
    description?: string;
    snippet?: string;
}

interface GoogleSearchResponse {
    status?: boolean;
    data?: GoogleSearchResult[];
}

export default defineSdkPlugin({
    help: ['google', 'googlef'].map((v) => v + ' <pencarian>'),
    tags: ['buscadores'],
    command: /^googlef?$/i,
    register: true,
    limit: 1,
    async execute(_m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('search.google.missingQuery', {command: sdk.usedPrefix + sdk.command})
    await sdk.reply.react("⌛")
    try {
        const data = await sdk.http.json<GoogleSearchResponse>(`${info.apis}/search/googlesearch?query=${encodeURIComponent(sdk.text)}`);

        if (data.status && data.data && data.data.length > 0) {
            let teks = sdk.content.renderMessage('search.google.primaryHeader', {query: sdk.text});
            for (let result of data.data) {
                teks += sdk.content.renderMessage('search.google.primaryItem', {
                    title: result.title || '',
                    url: result.url || '',
                    description: result.description || ''
                });
            }

            const ss = `https://image.thum.io/get/fullpage/https://google.com/search?q=${encodeURIComponent(sdk.text)}`;
            await sdk.sendFile(ss, 'result.png', teks);
            await sdk.reply.react("✅")
        }
    } catch (e: unknown) {
        try {
            if (!ENV.ALYACHAN_API_KEY) throw new Error('ALYACHAN_API_KEY no configurado');
            const data = await sdk.http.json<GoogleSearchResponse>(`https://api.alyachan.dev/api/google?q=${encodeURIComponent(sdk.text)}&apikey=${ENV.ALYACHAN_API_KEY}`);

            if (data.status && data.data && data.data.length > 0) {
                let teks = sdk.content.renderMessage('search.google.fallbackHeader', {query: sdk.text});
                for (let result of data.data) {
                    teks += sdk.content.renderMessage('search.google.fallbackItem', {
                        title: result.title || '',
                        url: result.formattedUrl || result.url || '',
                        description: result.snippet || result.description || ''
                    });
                }
                const ss = `https://image.thum.io/get/fullpage/https://google.com/search?q=${encodeURIComponent(sdk.text)}`;
                await sdk.sendFile(ss, 'result.png', teks);
            }
        } catch (e: unknown) {
            logInfo(e);
            await sdk.reply.react("❌")
        }
    }
    }
});
