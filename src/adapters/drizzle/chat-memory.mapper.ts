import type {ChatMemoryRecord, ExpirableChatMemory} from '../../domain/operations.js';

export interface ExpirableChatMemoryRow {
    chat_id: string;
    updated_at: Date | null;
    memory_ttl: number | null;
}

export interface ChatMemoryRecordRow {
    history: unknown[];
    updated_at: Date | null;
}

export function mapExpirableChatMemory(row: ExpirableChatMemoryRow): ExpirableChatMemory {
    return {
        chat_id: row.chat_id,
        updated_at: row.updated_at ?? new Date(0),
        memory_ttl: row.memory_ttl ?? 86400,
    };
}

export function mapChatMemoryRecord(row: ChatMemoryRecordRow): ChatMemoryRecord {
    return {
        history: row.history,
        updated_at: row.updated_at ?? null,
    };
}
