import {repositories} from './data-source.js';

export interface AiMemoryMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const DEFAULT_IA_PROMPT = 'Eres Pam_Bot, un asistente virtual integrado en un bot de WhatsApp. Responde de forma clara, breve y amable, en el mismo idioma del usuario.';

function normalizeHistory(history: unknown): AiMemoryMessage[] {
    if (!Array.isArray(history)) return [];

    return history.filter((item): item is AiMemoryMessage => {
        return item
            && typeof item === 'object'
            && ['system', 'user', 'assistant'].includes((item as AiMemoryMessage).role)
            && typeof (item as AiMemoryMessage).content === 'string';
    });
}

export async function getAiPromptSettings(chatId: string): Promise<{
    systemPrompt: string;
    ttl: number;
}> {
    const settings = await repositories.groupSettings.findByGroupId(chatId);
    return {
        systemPrompt: settings?.sAutorespond || DEFAULT_IA_PROMPT,
        ttl: settings?.memory_ttl ?? 86400,
    };
}

export async function getAiMemory(chatId: string, ttl: number): Promise<AiMemoryMessage[]> {
    const record = await repositories.chatMemory.findByChatId(chatId);
    if (!record) return [];

    const updatedAt = record.updated_at ? new Date(record.updated_at).getTime() : 0;
    const expired = !ttl || (updatedAt > 0 && Date.now() - updatedAt > ttl * 1000);
    return expired ? [] : normalizeHistory(record.history);
}

export async function saveAiMemory(chatId: string, memory: AiMemoryMessage[]): Promise<void> {
    await repositories.chatMemory.upsert(chatId, memory);
}

export async function clearAiMemory(chatId: string): Promise<void> {
    await repositories.chatMemory.deleteByChatId(chatId);
}

export function ensureSystemPrompt(
    memory: AiMemoryMessage[],
    systemPrompt: string,
): AiMemoryMessage[] {
    if (!memory.length || memory[0]?.role !== 'system' || memory[0]?.content !== systemPrompt) {
        return [{role: 'system', content: systemPrompt}];
    }

    return memory;
}
