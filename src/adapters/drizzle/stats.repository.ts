import {sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {stats} from '../../db/schema.js';
import type {StatsRepository} from '../../ports/repositories.js';

export const statsRepository: StatsRepository = {
    async incrementCommand(command) {
        await orm.insert(stats)
            .values({command, count: 1})
            .onConflictDoUpdate({
                target: stats.command,
                set: {count: sql`${stats.count} + 1`},
            });
    },

    async sumCommands() {
        const [row] = await orm
            .select({total: sql<number>`COALESCE(SUM(${stats.count}), 0)::int`})
            .from(stats);

        return row?.total ?? 0;
    },
};
