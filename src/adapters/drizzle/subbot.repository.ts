import {asc, eq, inArray, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {subbotOwners, subbotPrefixes, subbots, usuarios} from '../../db/schema.js';
import type {SubbotRepository} from '../../ports/repositories.js';
import {mapSubbotConfig} from './subbot.mapper.js';

export const subbotsRepository: SubbotRepository = {
    async findConfig(botId) {
        const [[row], prefixes, owners] = await Promise.all([
            orm.select().from(subbots).where(eq(subbots.id, botId)).limit(1),
            orm.select({value: subbotPrefixes.prefix}).from(subbotPrefixes)
                .where(eq(subbotPrefixes.botId, botId)).orderBy(asc(subbotPrefixes.position)),
            orm.select({value: subbotOwners.ownerId}).from(subbotOwners)
                .where(eq(subbotOwners.botId, botId)).orderBy(asc(subbotOwners.position)),
        ]);
        return row ? mapSubbotConfig(row, prefixes.map(item => item.value), owners.map(item => item.value)) : null;
    },

    async findInstanceIdByJid(botJid) {
        const [row] = await orm.select({id: subbots.id}).from(subbots)
            .where(eq(subbots.botJid, botJid)).limit(1);
        return row?.id ?? null;
    },

    async findBotJidByInstanceId(botId) {
        const [row] = await orm.select({botJid: subbots.botJid}).from(subbots)
            .where(eq(subbots.id, botId)).limit(1);
        return row?.botJid ?? null;
    },

    async listConfigs(instanceType) {
        const rows = instanceType
            ? await orm.select().from(subbots).where(eq(subbots.instanceType, instanceType))
            : await orm.select().from(subbots);
        if (!rows.length) return [];
        const botIds = rows.map(row => row.id);
        const [prefixes, owners] = await Promise.all([
            orm.select().from(subbotPrefixes).where(inArray(subbotPrefixes.botId, botIds))
                .orderBy(asc(subbotPrefixes.botId), asc(subbotPrefixes.position)),
            orm.select().from(subbotOwners).where(inArray(subbotOwners.botId, botIds))
                .orderBy(asc(subbotOwners.botId), asc(subbotOwners.position)),
        ]);
        return rows.map(row => mapSubbotConfig(
            row,
            prefixes.filter(item => item.botId === row.id).map(item => item.prefix),
            owners.filter(item => item.botId === row.id).map(item => item.ownerId),
        ));
    },

    async countByType() {
        const [row] = await orm.select({
            total: sql<number>`COUNT(*)::int`,
            main: sql<number>`COUNT(*) FILTER (WHERE ${subbots.instanceType} = 'main')::int`,
            subbots: sql<number>`COUNT(*) FILTER (WHERE ${subbots.instanceType} = 'subbot')::int`,
        }).from(subbots);

        return {
            total: row?.total ?? 0,
            main: row?.main ?? 0,
            subbots: row?.subbots ?? 0,
        };
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
        await orm.transaction(async tx => {
            await tx.insert(subbots).values({id: botId}).onConflictDoNothing();
            await tx.delete(subbotPrefixes).where(eq(subbotPrefixes.botId, botId));
            if (prefix.length) await tx.insert(subbotPrefixes).values(
                [...new Set(prefix)].map((value, position) => ({botId, prefix: value, position})),
            );
        });
    },

    async setOwners(botId, owners) {
        await orm.transaction(async tx => {
            await tx.insert(subbots).values({id: botId}).onConflictDoNothing();
            await tx.delete(subbotOwners).where(eq(subbotOwners.botId, botId));
            const uniqueOwners = [...new Set(owners)];
            if (uniqueOwners.length) {
                await tx.insert(usuarios).values(uniqueOwners.map(id => ({id}))).onConflictDoNothing();
                await tx.insert(subbotOwners).values(
                    uniqueOwners.map((ownerId, position) => ({botId, ownerId, position})),
                );
            }
        });
    },
};
