import {eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {subbots} from '../../db/schema.js';
import type {SubbotRepository} from '../../ports/repositories.js';
import {mapSubbotConfig} from './subbot.mapper.js';

export const subbotsRepository: SubbotRepository = {
    async findConfig(botId) {
        const [row] = await orm.select().from(subbots).where(eq(subbots.id, botId)).limit(1);
        return row ? mapSubbotConfig(row) : null;
    },

    async listConfigs(tipo) {
        const rows = tipo
            ? await orm.select().from(subbots).where(eq(subbots.tipo, tipo))
            : await orm.select().from(subbots);
        return rows.map(mapSubbotConfig);
    },

    async countByType() {
        const [row] = await orm.select({
            total: sql<number>`COUNT(*)::int`,
            oficiales: sql<number>`COUNT(*) FILTER (WHERE ${subbots.tipo} = 'oficial')::int`,
            subbots: sql<number>`COUNT(*) FILTER (WHERE ${subbots.tipo} = 'subbot')::int`,
        }).from(subbots);

        return {
            total: row?.total ?? 0,
            oficiales: row?.oficiales ?? 0,
            subbots: row?.subbots ?? 0,
        };
    },

    async updateTipo(botId, tipo) {
        await orm.update(subbots)
            .set({tipo})
            .where(eq(subbots.id, botId));
    },

    async setBooleanFlag(botId, flag, value) {
        const columns = {
            anti_private: subbots.antiPrivate,
            anti_call: subbots.antiCall,
            privacy: subbots.privacy,
            prestar: subbots.prestar,
        } as const;
        const column = columns[flag as keyof typeof columns];
        if (!column) throw new Error(`Flag de subbots no soportado: ${flag}`);

        const propertyByFlag = {
            anti_private: 'antiPrivate',
            anti_call: 'antiCall',
            privacy: 'privacy',
            prestar: 'prestar',
        } as const;
        const property = propertyByFlag[flag as keyof typeof propertyByFlag];

        await orm.insert(subbots)
            .values({id: botId, [property]: value})
            .onConflictDoUpdate({
                target: subbots.id,
                set: {[property]: value},
            });
    },

    async setName(botId, name) {
        await orm.insert(subbots)
            .values({id: botId, name})
            .onConflictDoUpdate({
                target: subbots.id,
                set: {name},
            });
    },

    async setLogoUrl(botId, logoUrl) {
        await orm.insert(subbots)
            .values({id: botId, logoUrl})
            .onConflictDoUpdate({
                target: subbots.id,
                set: {logoUrl},
            });
    },

    async setMode(botId, mode) {
        await orm.insert(subbots)
            .values({id: botId, mode})
            .onConflictDoUpdate({
                target: subbots.id,
                set: {mode},
            });
    },

    async setPrefix(botId, prefix) {
        await orm.insert(subbots)
            .values({id: botId, prefix})
            .onConflictDoUpdate({
                target: subbots.id,
                set: {prefix},
            });
    },

    async setOwners(botId, owners) {
        await orm.insert(subbots)
            .values({id: botId, owners})
            .onConflictDoUpdate({
                target: subbots.id,
                set: {owners},
            });
    },
};
