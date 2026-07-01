import {eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {chatMemory, groupSettings} from '../../db/schema.js';
import type {ChatMemoryRepository} from '../../ports/repositories.js';
import {mapChatMemoryRecord, mapExpirableChatMemory} from './chat-memory.mapper.js';

export const chatMemoryRepository: ChatMemoryRepository = {
    async listExpirable() {
        const rows = await orm
            .select({
                chat_id: chatMemory.chatId,
                updated_at: chatMemory.updatedAt,
                memory_ttl: groupSettings.memoryTtl,
            })
            .from(chatMemory)
            .innerJoin(groupSettings, eq(chatMemory.chatId, groupSettings.groupId))
            .where(sql`${groupSettings.memoryTtl} > 0`);

        return rows.map(mapExpirableChatMemory);
    },

    async findByChatId(chatId) {
        const [row] = await orm
            .select({
                history: chatMemory.history,
                updated_at: chatMemory.updatedAt,
            })
            .from(chatMemory)
            .where(eq(chatMemory.chatId, chatId))
            .limit(1);

        return row ? mapChatMemoryRecord(row) : null;
    },

    async upsert(chatId, history) {
        await orm.insert(chatMemory)
            .values({chatId, history, updatedAt: new Date()})
            .onConflictDoUpdate({
                target: chatMemory.chatId,
                set: {history, updatedAt: new Date()},
            });
    },

    async deleteByChatId(chatId) {
        await orm.delete(chatMemory).where(eq(chatMemory.chatId, chatId));
    },
};
