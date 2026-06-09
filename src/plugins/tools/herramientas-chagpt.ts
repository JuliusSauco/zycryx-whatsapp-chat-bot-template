import {logError} from '../../lib/logger.js';
import {blackboxAi} from '../../lib/scraper.js';
import {chatCompletion} from '../../lib/ai.js';
import {ensureSystemPrompt, getAiMemory, getAiPromptSettings, saveAiMemory} from '../../services/chat-memory.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

interface TextApiResponse {
    data?: string;
    result?: string;
    gpt?: string;
    message?: string;
}

interface BingResponse {
    result?: {
        ai_response?: string;
    };
}

export default defineSdkPlugin({
    help: ["chagpt", "ia", "openai", "gemini", "copilot", "blackbox", "deepseek"],
    tags: ["buscadores"],
    command: /^(openai|chatgpt|ia|ai|openai2|chatgpt2|ia2|gemini|copilot|bing|deepseek|blackbox)$/i,
    async execute(_m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('tools.ai.usage', {command: sdk.usedPrefix + sdk.command})
    const chatId = sdk.chatId;
    const {systemPrompt, ttl} = await getAiPromptSettings(chatId);
    let memory = ensureSystemPrompt(await getAiMemory(chatId, ttl), systemPrompt);
    memory.push({role: 'user', content: sdk.text});
    if (memory.length > 25) memory = [memory[0], ...memory.slice(-24)];

    if (sdk.command == 'ia' || sdk.command == 'chatgpt') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId)
        let result = '';
        // Intenta los proveedores con key en la DB (groq → xai → ...).
        const aiResult = await chatCompletion(memory, {temperature: 0.9, maxTokens: 600});
        if (aiResult) {
            result = aiResult;
        } else {
            // Todas las keys de la DB fallaron → fallback a API pública.
            try {
                let res = await sdk.http.json<TextApiResponse>(`${info.apis}/ia/gptprompt?text=${encodeURIComponent(sdk.text)}&prompt=${encodeURIComponent(systemPrompt)}`);
                result = res.data || sdk.content.message('tools.ai.noResponse');
            } catch (e: unknown) {
                result = sdk.content.message('tools.ai.noResponse');
            }
        }
        memory.push({role: 'assistant', content: result});

        try {
            await saveAiMemory(chatId, memory);
        } catch (e: unknown) {
            logError(sdk.content.message('tools.ai.saveMemoryError'), e instanceof Error ? e.message : e);
        }
        return await sdk.reply.text(result);
    }

    if (sdk.command == 'openai' || sdk.command == 'chatgpt2') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId);
        try {
            let res = await sdk.http.json<TextApiResponse>(`https://api.dorratz.com/ai/gpt?prompt=${encodeURIComponent(sdk.text)}`)
            const decoded = decodeApiText(res.result, sdk.content.message('tools.ai.noResponse'));
            await sdk.reply.text(decoded);
        } catch (e: unknown) {
            try {
                let res = await sdk.http.json<TextApiResponse>(`${info.apis}/ia/gptweb?text=${encodeURIComponent(sdk.text)}`)
                await sdk.reply.text(res.gpt || sdk.content.message('tools.ai.noResponse'))
            } catch (e: unknown) {
                try {
                    let res = await sdk.http.json<TextApiResponse>(`${info.apis}/api/ia2?text=${encodeURIComponent(sdk.text)}`)
                    await sdk.reply.text(res.gpt || sdk.content.message('tools.ai.noResponse'))
                } catch (e: unknown) {
                    try {
                        let res = await sdk.http.json<TextApiResponse>(`${info.apis}/ia/chatgpt?q=${encodeURIComponent(sdk.text)}`)
                        await sdk.reply.text(res.data || sdk.content.message('tools.ai.noResponse'))
                    } catch (e: unknown) {
                    }
                }
            }
        }
    }

    if (sdk.command == 'deepseek') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId);
        try {
            const res = await sdk.http.json<TextApiResponse>(`https://api.dorratz.com/ai/deepseek?prompt=${encodeURIComponent(sdk.text)}`);
            const decoded = decodeApiText(res.result, sdk.content.message('tools.ai.noResponse'));
            await sdk.reply.text(decoded);
        } catch (e: unknown) {
            logError('Error DeepSeek:', e);
            await sdk.reply.message('tools.ai.deepseekError');
        }
    }

    if (sdk.command == 'gemini') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId)
        try {
            let res = await sdk.http.json<TextApiResponse>(`https://api.dorratz.com/ai/gemini?prompt=${encodeURIComponent(sdk.text)}`)
            await sdk.reply.text(res.message || sdk.content.message('tools.ai.noResponse'))
        } catch (e: unknown) {
            try {
                let res = await sdk.http.json<TextApiResponse>(`https://delirius-apiofc.vercel.app/ia/gemini?query=${encodeURIComponent(sdk.text)}`)
                await sdk.reply.text(res.message || sdk.content.message('tools.ai.noResponse'))
            } catch (e: unknown) {
            }
        }
    }

    if (sdk.command === 'blackbox') {
        const result = await blackboxAi(sdk.text);
        if (result.status) return await sdk.reply.text(result.data.response);
        return await sdk.reply.message('tools.ai.blackboxError', {error: result.error});
    }

    if (sdk.command == 'copilot' || sdk.command == 'bing') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId)
        try {
            let res = await sdk.http.json<BingResponse>(`https://api.dorratz.com/ai/bing?prompt=${encodeURIComponent(sdk.text)}`)
            const responseText = res.result?.ai_response || sdk.content.message('tools.ai.noResponse')
            await sdk.sendMessage({
                text: responseText, contextInfo: {
                    externalAdReply: {
                        title: sdk.content.message('tools.ai.copilotTitle'),
                        body: sdk.content.message('tools.ai.copilotBody'),
                        thumbnailUrl: "https://qu.ax/nTDgf.jpg",
                        sourceUrl: "https://api.dorratz.com",
                        mediaType: 1,
                        showAdAttribution: false,
                        renderLargerThumbnail: false
                    }
                }
            })
//m.reply(res.result.ai_response)
        } catch (e: unknown) {
            try {
                let res = await sdk.http.json<TextApiResponse>(`${info.apis}/ia/bingia?query=${encodeURIComponent(sdk.text)}`)
                await sdk.reply.text(res.message || sdk.content.message('tools.ai.noResponse'))
            } catch (e: unknown) {
            }
        }
    }
    }
});

function decodeApiText(value: string | undefined, fallback: string): string {
    if (!value) return fallback;
    try {
        return JSON.parse(`"${value}"`) as string;
    } catch {
        return value;
    }
}
