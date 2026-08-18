import {sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import type {DatabaseRepository} from '../../ports/repositories.js';

function resultRows<T>(result: unknown): T[] {
    if (Array.isArray(result)) return result as T[];
    const rows = (result as {rows?: T[]})?.rows;
    return rows ?? [];
}

export const databaseRepository: DatabaseRepository = {
    async getInfo() {
        const [
            usuariosRes,
            registradosRes,
            chatsRes,
            gruposRes,
            mensajesRes,
            tablasRes,
            totalSizeRes,
        ] = await Promise.all([
            orm.execute(sql`SELECT COUNT(*)::int AS count FROM bot_identity.users`),
            orm.execute(sql`SELECT COUNT(*)::int AS count FROM bot_identity.user_registrations`),
            orm.execute(sql`SELECT COUNT(*)::int AS count FROM bot_groups.chats`),
            orm.execute(sql`SELECT COUNT(*)::int AS count FROM bot_groups.chats WHERE is_group = true`),
            orm.execute(sql`SELECT COALESCE(SUM(message_count), 0)::int AS count FROM bot_groups.user_group_activity_counters`),
            orm.execute(sql`
                SELECT relname AS tabla,
                       n_live_tup::int AS filas,
                       pg_size_pretty(pg_total_relation_size(relid)) AS tamano
                FROM pg_stat_user_tables
                WHERE schemaname LIKE 'bot\_%' ESCAPE '\\'
                ORDER BY pg_total_relation_size(relid) DESC
            `),
            orm.execute(sql`
                SELECT pg_size_pretty(COALESCE(SUM(pg_total_relation_size(relid)), 0)) AS total
                FROM pg_stat_user_tables
                WHERE schemaname LIKE 'bot\_%' ESCAPE '\\'
            `),
        ]);

        const usuariosRows = resultRows<{count: number}>(usuariosRes);
        const registradosRows = resultRows<{count: number}>(registradosRes);
        const chatsRows = resultRows<{count: number}>(chatsRes);
        const gruposRows = resultRows<{count: number}>(gruposRes);
        const mensajesRows = resultRows<{count: number}>(mensajesRes);
        const totalRows = resultRows<{total: string | null}>(totalSizeRes);

        return {
            usuarios: usuariosRows[0]?.count ?? 0,
            registrados: registradosRows[0]?.count ?? 0,
            chats: chatsRows[0]?.count ?? 0,
            grupos: gruposRows[0]?.count ?? 0,
            mensajes: mensajesRows[0]?.count ?? 0,
            tablas: resultRows<{tabla: string; filas: number; tamano: string}>(tablasRes),
            totalSize: totalRows[0]?.total ?? null,
        };
    },
};
