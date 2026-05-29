import fetch from 'node-fetch';
import {blackboxAi} from '../lib/scraper.js';
import {chatCompletion} from '../lib/ai.js';
import {ensureSystemPrompt, getAiMemory, getAiPromptSettings, saveAiMemory} from '../services/chat-memory.service.js';
import {definePlugin} from '../core/define-plugin.js';

export default definePlugin({
    help: ["chagpt", "ia", "openai", "gemini", "copilot", "blackbox", "deepseek"],
    tags: ["buscadores"],
    command: /^(openai|chatgpt|ia|ai|openai2|chatgpt2|ia2|gemini|copilot|bing|deepseek|blackbox)$/i,
    async execute(m, {conn, text, usedPrefix, command}) {
    let username = m.pushName
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
                let gpt = await fetch(`${info.apis}/ia/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(systemPrompt)}`);
                let res = await gpt.json();
                // @ts-ignore
                result = res.data || "❌ No se pudo generar una respuesta.";
            } catch (e: any) {
                result = "❌ No se pudo generar una respuesta.";
            }
        }
        memory.push({role: 'assistant', content: result});

        try {
            await saveAiMemory(chatId, memory);
        } catch (e: any) {
            console.error("❌ No se pudo guardar memoria:", e.message);
        }
        return await m.reply(result);
    }

    if (command == 'openai' || command == 'chatgpt2') {
        await conn.sendPresenceUpdate('composing', m.chat);
        try {
            let gpt = await fetch(`https://api.dorratz.com/ai/gpt?prompt=${text}`)
            let res = await gpt.json()
            // @ts-ignore
            const decoded = JSON.parse(`"${res.result}"`);
            await m.reply(decoded);
        } catch (e: any) {
            try {
                let gpt = await fetch(`${info.apis}/ia/gptweb?text=${text}`)
                let res = await gpt.json()
                // @ts-ignore
                await m.reply(res.gpt)
            } catch (e: any) {
                try {
                    let gpt = await fetch(`${info.apis}/api/ia2?text=${text}`)
                    let res = await gpt.json()
                    // @ts-ignore
                    await m.reply(res.gpt)
                } catch (e: any) {
                    try {
                        let gpt = await fetch(`${info.apis}/ia/chatgpt?q=${text}`)
                        let res = await gpt.json()
                        // @ts-ignore
                        await m.reply(res.data)
                    } catch (e: any) {
                    }
                }
            }
        }
    }

    if (command == 'deepseek') {
        await conn.sendPresenceUpdate('composing', m.chat);
        try {
            const gpt = await fetch(`https://api.dorratz.com/ai/deepseek?prompt=${encodeURIComponent(text)}`);
            const res = await gpt.json();
            // @ts-ignore
            const decoded = JSON.parse(`"${res.result}"`);
            await m.reply(decoded);
        } catch (e: any) {
            console.error('Error DeepSeek:', e);
            await m.reply('❌ Error al consultar DeepSeek API.');
        }
    }

    if (command == 'gemini') {
        await conn.sendPresenceUpdate('composing', m.chat)
        try {
            let gpt = await fetch(`https://api.dorratz.com/ai/gemini?prompt=${text}`)
            let res = await gpt.json()
            // @ts-ignore
            await m.reply(res.message)
        } catch (e: any) {
            try {
                let gpt = await fetch(`https://delirius-apiofc.vercel.app/ia/gemini?query=${text}`)
                let res = await gpt.json()
                // @ts-ignore
                await m.reply(res.message)
            } catch (e: any) {
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
            let gpt = await fetch(`https://api.dorratz.com/ai/bing?prompt=${text}`)
            let res = await gpt.json()
            await conn.sendMessage(m.chat, {
                // @ts-ignore
                text: res.result.ai_response, contextInfo: {
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
        } catch (e: any) {
            try {
                let gpt = await fetch(`${info.apis}/ia/bingia?query=${text}`)
                let res = await gpt.json()
                // @ts-ignore
                await m.reply(res.message)
            } catch (e: any) {
            }
        }
    }
    }
});

const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
