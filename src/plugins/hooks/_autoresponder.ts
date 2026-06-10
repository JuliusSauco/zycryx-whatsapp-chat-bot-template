import {exoml} from '../../lib/scraper.js';
import {chatCompletion} from '../../lib/ai.js';
import {logDebug, logError, logWarn} from '../../lib/logger.js';
import {ensureSystemPrompt, getAiMemory, getAiPromptSettings, saveAiMemory} from '../../services/chat-memory.service.js';
import type {ExtendedConn} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';
import {httpJson} from '../../lib/http-client.js';
import type {BeforePluginContext} from '../../types/context.js';
import {isGroupCreator} from '../../utils/group-creator.js';
import type {AccessMode, AutoresponderTrigger} from '../../types/config.js';

const MAX_TURNS = 12;

interface TextApiResponse {
    data?: string;
}

interface MessageContextInfo {
    participant?: string;
    remoteJid?: string;
}

function canUseAutoresponder(mode: AccessMode, ctx: BeforePluginContext, m: BotMessage): boolean {
    switch (mode) {
        case 'owner':
            return ctx.isOwner;
        case 'superadmin':
            return ctx.isOwner || isGroupCreator({chatId: ctx.chatId, sender: m.sender, senderLid: m.lid, metadata: ctx.metadata});
        case 'admin':
            return ctx.isOwner || ctx.isAdmin;
        default:
            return true;
    }
}

export async function before(m: BotMessage, ctx: BeforePluginContext & {conn: ExtendedConn}) {
    const {conn, groupSettings} = ctx;
    if (groupSettings?.autoresponder === false) return true;
    const autoresponderTrigger = (groupSettings?.autoresponderTrigger || 'mention') as AutoresponderTrigger;
    const autoresponderMode = (groupSettings?.autoresponderMode || 'all') as AccessMode;
    if (autoresponderTrigger !== 'all' && !canUseAutoresponder(autoresponderMode, ctx, m)) return true;

    const botIds = [conn.user?.id, conn.user?.lid].filter((j): j is string => Boolean(j)).map(j => j.split('@')[0].split(':')[0]);

    const contextInfo = m.msg?.contextInfo as MessageContextInfo | undefined;
    const mentioned = [...(m.mentionedJid || []),
        contextInfo?.participant,
        contextInfo?.remoteJid].filter((j): j is string => Boolean(j));

    const mention = mentioned.some(j => {
        const num = j?.split('@')[0]?.split(':')[0];
        return botIds.includes(num);
    });

    function formatForWhatsApp(text: string) {
        return text
            .replace(/\*\*/g, "*")
            .replace(/\_\_/g, "_")
            .replace(/\\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    const triggerWords = /\b(bot|simi|alexa|lolibot)\b/i;
    const isTrigger = triggerWords.test(m.originalText || '');
    const respondToAll = autoresponderTrigger === 'all';
    logDebug(`[AUTORESP] modo=${autoresponderTrigger} mención=${mention} trigger=${isTrigger} | originalText="${m.originalText}" text="${m.text}"`);
    if (!respondToAll && !mention && !isTrigger) return true;

    // 'bot' NO va en no_cmd: es palabra gatillo del autoresponder, no debe excluirse a sí misma.
    const no_cmd = /(PIEDRA|PAPEL|TIJERA|menu|estado|serbot|jadibot|Video|Audio|Exp|diamante|lolicoins?)/i;
    if (no_cmd.test(m.text || '')) {
        logDebug('[AUTORESP] omitido: el texto coincide con la lista no_cmd');
        return true;
    }
    logDebug('[AUTORESP] ✅ activando IA...');

    await conn.sendPresenceUpdate("composing", m.chat);
    const chatId = m.chat;
    const query = m.text || '';
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
        logWarn('[AUTORESP] ninguna IA con key respondió, usando fallback público');
        try {
            // Pasar el texto del usuario (string), NO el array `memory` (daba [object Object]).
            let res = await httpJson<TextApiResponse>(`${info.apis}/ia/gptprompt?text=${encodeURIComponent(query)}&prompt=${encodeURIComponent(systemPrompt)}`);
            result = res.data || '';
        } catch (err: unknown) {
            logWarn('[AUTORESP] fallback gptprompt falló, usando exoml:', err instanceof Error ? err.message : err);
            try {
                result = await exoml.generate(memory, systemPrompt, 'llama-4-scout');
            } catch {
                result = '';
            }
        }
    }

    if (!result || result.trim().length < 2) result = "🤖 ...";
    logDebug(`[AUTORESP] respuesta lista (${result.length} chars), enviando...`);
    memory.push({role: 'assistant', content: result});
    try {
        await saveAiMemory(chatId, memory);
    } catch (e: unknown) {
        logError("❌ No se pudo guardar memoria:", e instanceof Error ? e.message : e);
    }

    const formatted = formatForWhatsApp(result)
    return await conn.reply(m.chat, formatted, m)
//await conn.reply(m.chat, result, m);
    await conn.readMessages([m.key]);

    return false;
}
