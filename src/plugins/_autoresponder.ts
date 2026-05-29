import fetch from 'node-fetch';
import {exoml} from '../lib/scraper.js';
import {chatCompletion} from '../lib/ai.js';
import {ensureSystemPrompt, getAiMemory, getAiPromptSettings, saveAiMemory} from '../services/chat-memory.service.js';

const MAX_TURNS = 12;

export async function before(m: any, {conn}: any) {
    const botIds = [conn.user?.id, conn.user?.lid].filter(Boolean).map(j => j.split('@')[0].split(':')[0]);

    const mentioned = [...(m.mentionedJid || []),
        m.msg?.contextInfo?.participant,
        m.msg?.contextInfo?.remoteJid].filter(Boolean);

    const mention = mentioned.some(j => {
        const num = j?.split('@')[0]?.split(':')[0];
        return botIds.includes(num);
    });

    function formatForWhatsApp(text: any) {
        return text
            .replace(/\*\*/g, "*")
            .replace(/\_\_/g, "_")
            .replace(/\\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    const triggerWords = /\b(bot|simi|alexa|lolibot)\b/i;
    const isTrigger = triggerWords.test(m.originalText || '');
    console.log(`[AUTORESP] mención=${mention} trigger=${isTrigger} | originalText="${m.originalText}" text="${m.text}"`);
    if (!mention && !isTrigger) return true;

    // 'bot' NO va en no_cmd: es palabra gatillo del autoresponder, no debe excluirse a sí misma.
    const no_cmd = /(PIEDRA|PAPEL|TIJERA|menu|estado|serbot|jadibot|Video|Audio|Exp|diamante|lolicoins?)/i;
    if (no_cmd.test(m.text || '')) {
        console.log('[AUTORESP] omitido: el texto coincide con la lista no_cmd');
        return true;
    }
    console.log('[AUTORESP] ✅ activando IA...');

    await conn.sendPresenceUpdate("composing", m.chat);
    const chatId = m.chat;
    const query = m.text;
    const {systemPrompt, ttl} = await getAiPromptSettings(chatId);
    let memory = ensureSystemPrompt(await getAiMemory(chatId, ttl), systemPrompt);

    memory.push({role: 'user', content: query});
    if (memory.length > MAX_TURNS * 2 + 1) {
        memory = [memory[0], ...memory.slice(-MAX_TURNS * 2)];
    }

    let result = '';
    // Intenta los proveedores con key en la DB (groq → xai → ...).
    const aiResult = await chatCompletion(memory, {temperature: 0.9, maxTokens: 600});
    if (aiResult) {
        result = aiResult;
    } else {
        // Todas las keys de la DB fallaron → fallback a APIs públicas.
        console.error('[AUTORESP] ninguna IA con key respondió, usando fallback público');
        try {
            // Pasar el texto del usuario (string), NO el array `memory` (daba [object Object]).
            let gpt = await fetch(`${info.apis}/ia/gptprompt?text=${encodeURIComponent(query)}&prompt=${encodeURIComponent(systemPrompt)}`);
            let res = await gpt.json();
            // @ts-ignore
            result = res.data;
        } catch (err: any) {
            console.error('[AUTORESP] fallback gptprompt falló, usando exoml:', err?.message || err);
            try {
                result = await exoml.generate(memory, systemPrompt, 'llama-4-scout');
            } catch {
                result = '';
            }
        }
    }

    if (!result || result.trim().length < 2) result = "🤖 ...";
    console.log(`[AUTORESP] respuesta lista (${result.length} chars), enviando...`);
    memory.push({role: 'assistant', content: result});
    try {
        await saveAiMemory(chatId, memory);
    } catch (e: any) {
        console.error("❌ No se pudo guardar memoria:", e.message);
    }

    const formatted = formatForWhatsApp(result)
    return await conn.reply(m.chat, formatted, m)
//await conn.reply(m.chat, result, m);
    await conn.readMessages([m.key]);

    return false;
}
