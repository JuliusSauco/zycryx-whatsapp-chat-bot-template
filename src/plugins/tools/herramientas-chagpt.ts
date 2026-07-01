import {logError} from '../../lib/logger.js';
import {ensureSystemPrompt, getAiMemory, getAiPromptSettings, saveAiMemory} from '../../services/chat-memory.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {
    generateBlackboxText,
    generateCopilotText,
    generateDeepSeekText,
    generateGeminiText,
    generateMemoryChatResponse,
    generateOpenAiText,
} from '../../providers/ai/text.provider.js';

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
        const aiResult = await generateMemoryChatResponse(sdk.text, memory, {
            fallbackText: sdk.content.message('tools.ai.noResponse'),
            systemPrompt,
            temperature: 0.9,
            maxTokens: 600,
        });
        const result = aiResult.data || sdk.content.message('tools.ai.noResponse');
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
        const result = await generateOpenAiText(sdk.text);
        await sdk.reply.text(result.data || sdk.content.message('tools.ai.noResponse'));
    }

    if (sdk.command == 'deepseek') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId);
        const result = await generateDeepSeekText(sdk.text);
        if (result.data) {
            await sdk.reply.text(result.data);
        } else {
            logError('Error DeepSeek:', result.failures);
            await sdk.reply.message('tools.ai.deepseekError');
        }
    }

    if (sdk.command == 'gemini') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId)
        const result = await generateGeminiText(sdk.text);
        await sdk.reply.text(result.data || sdk.content.message('tools.ai.noResponse'));
    }

    if (sdk.command === 'blackbox') {
        const result = await generateBlackboxText(sdk.text);
        if (result.data) return await sdk.reply.text(result.data);
        return await sdk.reply.message('tools.ai.blackboxError', {error: result.failures[0]?.error || sdk.content.message('tools.ai.noResponse')});
    }

    if (sdk.command == 'copilot' || sdk.command == 'bing') {
        await sdk.conn.sendPresenceUpdate('composing', sdk.chatId)
        const result = await generateCopilotText(sdk.text);
        const responseText = result.data || sdk.content.message('tools.ai.noResponse');
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
    }
    }
});
