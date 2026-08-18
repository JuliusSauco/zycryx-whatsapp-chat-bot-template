import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {groupCensoredUsers, groupSettings, usuarios} from '../../db/schema.js';
import type {CensoredUserRepository} from '../../ports/repositories.js';

export const censoredUserRepository: CensoredUserRepository = {
    async listByGroup(groupId) {
        const rows = await orm.select({
            groupId: groupCensoredUsers.groupId,
            userId: groupCensoredUsers.userId,
            userLid: sql<string | null>`(
                SELECT identity_value FROM bot_identity.user_identities
                WHERE user_id = ${groupCensoredUsers.userId} AND identity_type = 'lid' LIMIT 1
            )`,
            censoredBy: groupCensoredUsers.censoredBy,
            createdAt: groupCensoredUsers.createdAt,
        }).from(groupCensoredUsers)
            .where(eq(groupCensoredUsers.groupId, groupId))
            .orderBy(groupCensoredUsers.createdAt);
        return rows.map(row => ({
            group_id: row.groupId,
            user_id: row.userId,
            user_lid: row.userLid,
            censored_by: row.censoredBy,
            created_at: row.createdAt,
        }));
    },

    async upsert(input) {
        return orm.transaction(async tx => {
            await tx.insert(groupSettings).values({groupId: input.groupId}).onConflictDoNothing();
            await tx.insert(usuarios).values([{id: input.userId}, {id: input.censoredBy}]).onConflictDoNothing();
            const inserted = await tx.insert(groupCensoredUsers).values({
                groupId: input.groupId,
                userId: input.userId,
                censoredBy: input.censoredBy,
            }).onConflictDoNothing().returning({userId: groupCensoredUsers.userId});
            return {created: inserted.length > 0};
        });
    },

    async delete(groupId, userId, userLid) {
        let resolvedUserId = userId;
        if (userLid) {
            const rows = await orm.execute<{user_id: string}>(sql`
                SELECT user_id FROM bot_identity.user_identities
                WHERE identity_type = 'lid' AND identity_value = ${userLid} LIMIT 1
            `);
            resolvedUserId = rows.rows[0]?.user_id ?? userId;
        }
        const deleted = await orm.delete(groupCensoredUsers)
            .where(and(eq(groupCensoredUsers.groupId, groupId), eq(groupCensoredUsers.userId, resolvedUserId)))
            .returning({userId: groupCensoredUsers.userId});
        return deleted.length > 0;
    },
};
