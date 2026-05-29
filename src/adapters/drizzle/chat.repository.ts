import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {chats} from '../../db/schema.js';
import type {ChatRepository} from '../../ports/repositories.js';

export const chatsRepository: ChatRepository = {
    async upsertActiveChat({chatId, isGroup, timestamp, botId}) {
        await orm.insert(chats)
            .values({id: chatId, isGroup, timestamp, botId, joined: true})
            .onConflictDoUpdate({
                target: chats.id,
                set: {timestamp, botId, joined: true},
            });
    },

    async insertIfMissing(chatId) {
        await orm.insert(chats)
            .values({id: chatId})
            .onConflictDoNothing();
    },

    async markBotLeftGroup(groupId, botId) {
        await orm.update(chats)
            .set({joined: false})
            .where(and(eq(chats.id, groupId), eq(chats.botId, botId)));
    },

    async listJoinedGroupIdsByBot(botId) {
        const rows = await orm
            .select({id: chats.id})
            .from(chats)
            .where(and(
                eq(chats.isGroup, true),
                eq(chats.joined, true),
                eq(chats.botId, botId),
            ));

        return rows.map(row => row.id);
    },

    async countChats() {
        const [row] = await orm
            .select({total: sql<number>`COUNT(*)::int`})
            .from(chats);

        return row?.total ?? 0;
    },

    async countByBot(botId) {
        const [row] = await orm
            .select({
                totalGroups: sql<number>`COUNT(*) FILTER (WHERE ${chats.isGroup} = true)::int`,
                joinedGroups: sql<number>`COUNT(*) FILTER (WHERE ${chats.isGroup} = true AND ${chats.joined} = true)::int`,
                privateChats: sql<number>`COUNT(*) FILTER (WHERE ${chats.isGroup} = false)::int`,
            })
            .from(chats)
            .where(eq(chats.botId, botId));

        return {
            totalGroups: row?.totalGroups ?? 0,
            joinedGroups: row?.joinedGroups ?? 0,
            privateChats: row?.privateChats ?? 0,
        };
    },
};
