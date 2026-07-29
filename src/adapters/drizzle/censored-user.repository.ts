import {and, eq, or} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {groupCensoredUsers} from '../../db/schema.js';
import type {CensoredUserRepository} from '../../ports/repositories.js';

export const censoredUserRepository: CensoredUserRepository = {
    async listByGroup(groupId) {
        const rows = await orm.select().from(groupCensoredUsers)
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
        const inserted = await orm.insert(groupCensoredUsers).values({
            groupId: input.groupId,
            userId: input.userId,
            userLid: input.userLid,
            censoredBy: input.censoredBy,
        }).onConflictDoNothing().returning({userId: groupCensoredUsers.userId});
        return {created: inserted.length > 0};
    },

    async delete(groupId, userId, userLid) {
        const identity = userLid
            ? or(eq(groupCensoredUsers.userId, userId), eq(groupCensoredUsers.userLid, userLid))
            : eq(groupCensoredUsers.userId, userId);
        const deleted = await orm.delete(groupCensoredUsers)
            .where(and(eq(groupCensoredUsers.groupId, groupId), identity))
            .returning({userId: groupCensoredUsers.userId});
        return deleted.length > 0;
    },
};
