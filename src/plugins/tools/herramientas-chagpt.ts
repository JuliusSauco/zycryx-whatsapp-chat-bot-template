import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {blackboxAi} from '../../lib/scraper.js';
import {chatCompletion} from '../../lib/ai.js';
import {ensureSystemPrompt, getAiMemory, getAiPromptSettings, saveAiMemory} from '../../services/chat-memory.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import {httpJson} from '../../lib/http-client.js';

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

export default definePlugin({
    help: ["chagpt", "ia", "openai", "gemini", "copilot", "blackbox", "deepseek"],
    tags: ["buscadores"],
    command: /^(openai|chatgpt|ia|ai|openai2|chatgpt2|ia2|gemini|copilot|bing|deepseek|blackbox)$/i,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(`*Hola cómo esta 😊, El que te puedo ayudar?*, ingrese una petición o orden para usar la función de chagpt\n*Ejemplo:*\n${usedPrefix + command} Recomienda un top 10 de películas de acción`)
    const chatId = m.chat;
    const {systemPrompt, ttl} = await getAiPromptSettings(chatId);
    let memory = ensureSystemPrompt(await getAiMemory(chatId, ttl), systemPrompt);
    memory.push({role: 'user', content: text});
    if (memory.length > 25) memory = [memory[0], ...memory.slice(-24)];

    if (command == 'ia' || command == 'chatgpt') {
        await conn.sendPresenceUpdate('composing', m.chat)
        let result = '';
        // Intenta los proveedores con key en la DB (groq → xai → ...).
        const aiResult = await chatCompletion(memory, {temperature: 0.9, maxTokens: 600});
        if (aiResult) {
            result = aiResult;
        } else {
            // Todas las keys de la DB fallaron → fallback a API pública.
            try {
                let res = await httpJson<TextApiResponse>(`${info.apis}/ia/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(systemPrompt)}`);
                result = res.data || "❌ No se pudo generar una respuesta.";
            } catch (e: unknown) {
                result = "❌ No se pudo generar una respuesta.";
            }
        }
        memory.push({role: 'assistant', content: result});

        try {
            await saveAiMemory(chatId, memory);
        } catch (e: unknown) {
            logError("❌ No se pudo guardar memoria:", e instanceof Error ? e.message : e);
        }
        return await m.reply(result);
    }

    if (command == 'openai' || command == 'chatgpt2') {
        await conn.sendPresenceUpdate('composing', m.chat);
        try {
            let res = await httpJson<TextApiResponse>(`https://api.dorratz.com/ai/gpt?prompt=${text}`)
            const decoded = decodeApiText(res.result);
            await m.reply(decoded);
        } catch (e: unknown) {
            try {
                let res = await httpJson<TextApiResponse>(`${info.apis}/ia/gptweb?text=${text}`)
                await m.reply(res.gpt || '❌ No se pudo generar una respuesta.')
            } catch (e: unknown) {
                try {
                    let res = await httpJson<TextApiResponse>(`${info.apis}/api/ia2?text=${text}`)
                    await m.reply(res.gpt || '❌ No se pudo generar una respuesta.')
                } catch (e: unknown) {
                    try {
                        let res = await httpJson<TextApiResponse>(`${info.apis}/ia/chatgpt?q=${text}`)
                        await m.reply(res.data || '❌ No se pudo generar una respuesta.')
                    } catch (e: unknown) {
                    }
                }
            }
        }
    }

    if (command == 'deepseek') {
        await conn.sendPresenceUpdate('composing', m.chat);
        try {
            const res = await httpJson<TextApiResponse>(`https://api.dorratz.com/ai/deepseek?prompt=${encodeURIComponent(text)}`);
            const decoded = decodeApiText(res.result);
            await m.reply(decoded);
        } catch (e: unknown) {
            logError('Error DeepSeek:', e);
            await m.reply('❌ Error al consultar DeepSeek API.');
        }
    }

    if (command == 'gemini') {
        await conn.sendPresenceUpdate('composing', m.chat)
        try {
            let res = await httpJson<TextApiResponse>(`https://api.dorratz.com/ai/gemini?prompt=${text}`)
            await m.reply(res.message || '❌ No se pudo generar una respuesta.')
        } catch (e: unknown) {
            try {
                let res = await httpJson<TextApiResponse>(`https://delirius-apiofc.vercel.app/ia/gemini?query=${text}`)
                await m.reply(res.message || '❌ No se pudo generar una respuesta.')
            } catch (e: unknown) {
            }
        }
    }

    if (command === 'blackbox') {
        const result = await blackboxAi(text);
        if (result.status) return await m.reply(result.data.response);
        return await m.reply("❌ Error de blackbox.ai: " + result.error);
    }

    if (command == 'copilot' || command == 'bing') {
        await conn.sendPresenceUpdate('composing', m.chat)
        try {
            let res = await httpJson<BingResponse>(`https://api.dorratz.com/ai/bing?prompt=${text}`)
            const responseText = res.result?.ai_response || '❌ No se pudo generar una respuesta.'
            await conn.sendMessage(m.chat, {
                text: responseText, contextInfo: {
                    externalAdReply: {
                        title: "[ IA COPILOT ]",
                        body: "LoliBot",
                        thumbnailUrl: "https://qu.ax/nTDgf.jpg",
                        sourceUrl: "https://api.dorratz.com",
                        mediaType: 1,
                        showAdAttribution: false,
                        renderLargerThumbnail: false
                    }
                }
            }, {quoted: m})
//m.reply(res.result.ai_response)
        } catch (e: unknown) {
            try {
                let res = await httpJson<TextApiResponse>(`${info.apis}/ia/bingia?query=${text}`)
                await m.reply(res.message || '❌ No se pudo generar una respuesta.')
            } catch (e: unknown) {
            }
        }
    }
    }
});

function decodeApiText(value: string | undefined): string {
    if (!value) return '❌ No se pudo generar una respuesta.';
    try {
        return JSON.parse(`"${value}"`) as string;
    } catch {
        return value;
    }
}
