import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {chats, messages, usuarios} from '../../db/schema.js';
import type {MessageRepository} from '../../ports/repositories.js';

export const messagesRepository: MessageRepository = {
    async incrementUserGroupCount(userId, groupId) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id: userId}).onConflictDoNothing();
            await tx.insert(chats).values({id: groupId, isGroup: true}).onConflictDoNothing();
            await tx.insert(messages)
                .values({userId, groupId, messageCount: 1, lastMessageAt: new Date()})
                .onConflictDoUpdate({
                    target: [messages.userId, messages.groupId],
                    set: {
                        messageCount: sql`${messages.messageCount} + 1`,
                        lastMessageAt: new Date(),
                    },
                });
        });
    },

    async deleteUserGroupCount(userId, groupId) {
        await orm.delete(messages)
            .where(and(eq(messages.userId, userId), eq(messages.groupId, groupId)));
    },

    async listGroupCounts(groupId) {
        const rows = await orm
            .select({
                user_id: messages.userId,
                message_count: messages.messageCount,
            })
            .from(messages)
            .where(eq(messages.groupId, groupId));

        return rows.map(row => ({
            user_id: row.user_id,
            message_count: row.message_count ?? 0,
        }));
    },

    async listGroupActivity(groupId) {
        const rows = await orm
            .select({
                user_id: messages.userId,
                message_count: messages.messageCount,
                last_message_at: messages.lastMessageAt,
            })
            .from(messages)
            .where(eq(messages.groupId, groupId));

        return rows.map(row => ({
            user_id: row.user_id,
            message_count: row.message_count ?? 0,
            last_message_at: row.last_message_at ?? null,
        }));
    },
};
