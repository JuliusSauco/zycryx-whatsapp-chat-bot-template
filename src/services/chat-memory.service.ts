import {repositories} from './data-source.js';
import type {AiMemoryMessage} from '../domain/operations.js';
import {DEFAULT_IA_PROMPT, normalizeAiHistory} from '../domain/operations.js';

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
    return expired ? [] : normalizeAiHistory(record.history);
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
