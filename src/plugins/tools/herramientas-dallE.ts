import {logInfo} from '../../lib/logger.js';
import * as cheerio from "cheerio"
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {ENV} from '../../core/env.js'

type TextFetcher = (url: string, options?: {headers?: Record<string, string>}) => Promise<string>;

interface DorratzImageResponse {
    data?: {
        status?: string;
        image_link?: string;
    };
}

interface UnsplashResponse {
    results?: Array<{
        urls?: {
            regular?: string;
        };
    }>;
}

interface BetabotzImageResponse {
    result?: string[];
}

interface VihangaImagineResponse {
    data?: string;
}

export default defineSdkPlugin({
    help: ["dalle"],
    tags: ["buscadores"],
    command: ['dall-e', 'dalle', 'ia2', 'cimg', 'openai3', 'a-img', 'aimg', 'imagine'],
    register: true,
    limit: 1,
    async execute(_m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('tools.imageAi.usage', {command: sdk.usedPrefix + sdk.command})
    await sdk.reply.react('⌛')
    try {
        const res = await sdk.http.json<DorratzImageResponse>(`https://api.dorratz.com/v3/ai-image?prompt=${encodeURIComponent(sdk.text)}`)
        if (res.data?.status === "success" && res.data.image_link) {
            const imageUrl = res.data.image_link;
            await sdk.sendFile(imageUrl, 'error.jpg', sdk.content.renderMessage('tools.imageAi.generatedCaption', {query: sdk.text}));
            await sdk.reply.react('✅');
        }
    } catch (e: unknown) {
        try {
            let answer = await flux(sdk.text, sdk.http.text)
            if (!answer) throw new Error('Flux no devolvió imagen')
            await sdk.sendFile(answer, 'error.jpg', sdk.content.renderMessage('tools.imageAi.generatedCaption', {query: sdk.text}));
//conn.sendMessage(m.chat, { image: { url: answer }, caption: `_💫 Resutados: ${text}_\n\n> *✨ Imagen generada por IA ✨*`, mentions: [m.sender],}, { quoted: m })
            await sdk.reply.react('✅');
        } catch (e: unknown) {
            try {
                if (!ENV.UNSPLASH_ACCESS_KEY) throw new Error('UNSPLASH_ACCESS_KEY no configurado');
                const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(sdk.text)}&client_id=${ENV.UNSPLASH_ACCESS_KEY}`;
                const response = await sdk.http.json<UnsplashResponse>(url);
                const imageUrl = response.results?.[0]?.urls?.regular;
                if (!imageUrl) return sdk.reply.react("❌")
                await sdk.sendFile(imageUrl, 'error.jpg', sdk.content.renderMessage('tools.imageAi.resultCaption', {query: sdk.text}));
                await sdk.reply.react('✅');
            } catch (e: unknown) {
                try {
                    if (!ENV.BETABOTZ_API_KEY) throw new Error('BETABOTZ_API_KEY no configurado');
                    const url = `https://api.betabotz.eu.org/api/search/bing-img?text=${encodeURIComponent(sdk.text)}&apikey=${ENV.BETABOTZ_API_KEY}`;
                    const response = await sdk.http.json<BetabotzImageResponse>(url);
                    if (!response.result || response.result.length === 0) return sdk.reply.react("❌")
                    const imageUrl = response.result[0];
                    await sdk.sendFile(imageUrl, 'error.jpg', sdk.content.renderMessage('tools.imageAi.resultCaption', {query: sdk.text}));
                    await sdk.reply.react('✅');
                } catch (e: unknown) {
                    try {
                        const json1 = await sdk.http.json<VihangaImagineResponse>(`https://vihangayt.me/tools/imagine?q=${encodeURIComponent(sdk.text)}`);
                        if (!json1.data) throw new Error('Vihanga no devolvió imagen')
                        await sdk.sendFile(json1.data, 'error.jpg', sdk.content.renderMessage('tools.imageAi.resultCaption', {query: sdk.text}));
                    } catch (e: unknown) {
                        try {
                            if (!ENV.LOLHUMAN_API_KEY) throw new Error('LOLHUMAN_API_KEY no configurado');
                            const tiores4 = await sdk.conn.getFile?.(`https://api.lolhuman.xyz/api/dall-e?apikey=${ENV.LOLHUMAN_API_KEY}&text=${encodeURIComponent(sdk.text)}`);
                            if (!tiores4?.data) throw new Error('No se pudo obtener la imagen generada');
                            await sdk.sendFile(tiores4.data, 'error.jpg', sdk.content.renderMessage('tools.imageAi.resultCaption', {query: sdk.text}));
                            await sdk.reply.react('✅')
                        } catch (error: unknown) {
                            logInfo('[❗] Error, ninguna api funcional.\n' + error);
                            await sdk.reply.message('tools.imageAi.error', {error: String(error)})
                            await sdk.reply.react('❌')
                        }
                    }
                }
            }
        }
    }
    }
});

const flux = async (prompt: string, fetchText: TextFetcher): Promise<string | null> => {
    const url = `https://lusion.regem.in/access/flux.php?prompt=${encodeURIComponent(prompt)}`
    const headers = {
        Accept: "*/*",
        "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://lusion.regem.in/?ref=taaft&utm_source=taaft&utm_medium=referral",
    }
    const html = await fetchText(url, {headers})
    const $ = cheerio.load(html)
    return $("a.btn-navy.btn-sm.mt-2").attr("href") || null
}

