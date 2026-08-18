import {and, eq} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {messageLogs, usuarios} from '../../db/schema.js';
import type {MessageLogRepository} from '../../ports/repositories.js';

export const messageLogRepository: MessageLogRepository = {
    async create(input) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id: input.userId}).onConflictDoNothing();
            await tx.insert(messageLogs).values(input);
        });
    },

    async markDeleted({groupId, messageId, deletedBy, deletedByLid, deletedAt}) {
        await orm.transaction(async tx => {
            if (deletedBy) await tx.insert(usuarios).values({id: deletedBy}).onConflictDoNothing();
            await tx.update(messageLogs)
                .set({isDeleted: true, deletedAt, deletedBy})
                .where(and(eq(messageLogs.groupId, groupId), eq(messageLogs.messageId, messageId)));
        });
    },
};
