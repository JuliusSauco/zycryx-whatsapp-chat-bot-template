import {asc, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {chatMemory, chatMemoryMessages, groupMemorySettings} from '../../db/schema.js';
import type {ChatMemoryRepository} from '../../ports/repositories.js';
import {mapChatMemoryRecord, mapExpirableChatMemory} from './chat-memory.mapper.js';
import {normalizeAiHistory} from '../../domain/operations.js';

export const chatMemoryRepository: ChatMemoryRepository = {
    async listExpirable() {
        const rows = await orm
            .select({
                chat_id: chatMemory.chatId,
                updated_at: chatMemory.updatedAt,
                memory_ttl: groupMemorySettings.ttlSeconds,
            })
            .from(chatMemory)
            .innerJoin(groupMemorySettings, eq(chatMemory.chatId, groupMemorySettings.groupId))
            .where(sql`${groupMemorySettings.ttlSeconds} > 0`);

        return rows.map(mapExpirableChatMemory);
    },

    async findByChatId(chatId) {
        const [session] = await orm
            .select({
                updated_at: chatMemory.updatedAt,
            })
            .from(chatMemory)
            .where(eq(chatMemory.chatId, chatId))
            .limit(1);

        if (!session) return null;
        const messages = await orm.select({
            role: chatMemoryMessages.role,
            content: chatMemoryMessages.content,
        }).from(chatMemoryMessages).where(eq(chatMemoryMessages.chatId, chatId))
            .orderBy(asc(chatMemoryMessages.position));
        return mapChatMemoryRecord({history: messages, updated_at: session.updated_at});
    },

    async upsert(chatId, history) {
        const messages = normalizeAiHistory(history);
        await orm.transaction(async tx => {
            await tx.insert(chatMemory)
                .values({chatId, updatedAt: new Date()})
                .onConflictDoUpdate({target: chatMemory.chatId, set: {updatedAt: new Date()}});
            await tx.delete(chatMemoryMessages).where(eq(chatMemoryMessages.chatId, chatId));
            if (messages.length) await tx.insert(chatMemoryMessages).values(messages.map((message, position) => ({
                chatId,
                position,
                role: message.role,
                content: message.content,
            })));
        });
    },

    async deleteByChatId(chatId) {
        await orm.delete(chatMemory).where(eq(chatMemory.chatId, chatId));
    },
};
