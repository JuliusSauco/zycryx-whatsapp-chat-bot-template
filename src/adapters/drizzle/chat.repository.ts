import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {botChatMemberships, chats} from '../../db/schema.js';
import type {ChatRepository} from '../../ports/repositories.js';

export const chatsRepository: ChatRepository = {
    async upsertActiveChat({chatId, isGroup, timestamp, botId}) {
        const activityAt = new Date(timestamp);
        await orm.transaction(async tx => {
            await tx.insert(chats).values({id: chatId, isGroup, lastActivityAt: activityAt})
                .onConflictDoUpdate({
                    target: chats.id,
                    set: {isGroup, lastActivityAt: activityAt, isActive: true},
                });
            await tx.insert(botChatMemberships).values({botId, chatId, joined: true})
                .onConflictDoUpdate({
                    target: [botChatMemberships.botId, botChatMemberships.chatId],
                    set: {joined: true, leftAt: null, updatedAt: new Date()},
                });
        });
    },

    async insertIfMissing(chatId) {
        await orm.insert(chats).values({id: chatId}).onConflictDoNothing();
    },

    async markBotLeftGroup(groupId, botId) {
        await orm.update(botChatMemberships).set({joined: false, leftAt: new Date(), updatedAt: new Date()})
            .where(and(eq(botChatMemberships.chatId, groupId), eq(botChatMemberships.botId, botId)));
    },

    async listJoinedGroupIdsByBot(botId) {
        const rows = await orm.select({id: chats.id}).from(botChatMemberships)
            .innerJoin(chats, eq(chats.id, botChatMemberships.chatId))
            .where(and(
                eq(botChatMemberships.botId, botId),
                eq(botChatMemberships.joined, true),
                eq(chats.isGroup, true),
            ));
        return rows.map(row => row.id);
    },

    async countChats() {
        const [row] = await orm.select({total: sql<number>`COUNT(*)::int`}).from(chats);
        return row?.total ?? 0;
    },

    async countByBot(botId) {
        const [row] = await orm.select({
            totalGroups: sql<number>`COUNT(*) FILTER (WHERE ${chats.isGroup} = true)::int`,
            joinedGroups: sql<number>`COUNT(*) FILTER (WHERE ${chats.isGroup} = true AND ${botChatMemberships.joined} = true)::int`,
            privateChats: sql<number>`COUNT(*) FILTER (WHERE ${chats.isGroup} = false)::int`,
        }).from(botChatMemberships).innerJoin(chats, eq(chats.id, botChatMemberships.chatId))
            .where(eq(botChatMemberships.botId, botId));
        return {
            totalGroups: row?.totalGroups ?? 0,
            joinedGroups: row?.joinedGroups ?? 0,
            privateChats: row?.privateChats ?? 0,
        };
    },
};
