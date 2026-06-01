import {and, eq} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {messageLogs} from '../../db/schema.js';
import type {MessageLogRepository} from '../../ports/repositories.js';

export const messageLogRepository: MessageLogRepository = {
    async create(input) {
        await orm.insert(messageLogs).values(input);
    },

    async markDeleted({groupId, messageId, deletedBy, deletedByLid, deletedAt}) {
        await orm.update(messageLogs)
            .set({
                isDeleted: true,
                deletedAt,
                deletedBy,
                deletedByLid,
            })
            .where(and(eq(messageLogs.groupId, groupId), eq(messageLogs.messageId, messageId)));
    },
};
