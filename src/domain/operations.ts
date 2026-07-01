export type MessageLogType = 'text' | 'multimedia';

export interface CreateMessageLogInput {
    groupId: string;
    userId: string;
    messageId: string;
    messageText: string;
    messageType: MessageLogType;
    isReply: boolean;
    replyToMessageId: string | null;
}

export interface MarkMessageDeletedInput {
    groupId: string;
    messageId: string;
    deletedBy: string | null;
    deletedByLid: string | null;
    deletedAt: Date;
}

export interface ExpirableChatMemory {
    chat_id: string;
    updated_at: Date;
    memory_ttl: number;
}

export interface ChatMemoryRecord {
    history: unknown;
    updated_at: Date | null;
}

export interface AiMemoryMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const DEFAULT_IA_PROMPT = 'Eres Bot, un asistente virtual integrado en un bot de WhatsApp. Responde de forma clara, breve y amable, en el mismo idioma del usuario.';

export function normalizeAiHistory(history: unknown): AiMemoryMessage[] {
    if (!Array.isArray(history)) return [];

    return history.filter((item): item is AiMemoryMessage => {
        return item
            && typeof item === 'object'
            && ['system', 'user', 'assistant'].includes((item as AiMemoryMessage).role)
            && typeof (item as AiMemoryMessage).content === 'string';
    });
}
