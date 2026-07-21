import {and, eq, lte, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {commandResourceReservations, usuarios} from '../../db/schema.js';
import type {CommandResourceReservation} from '../../domain/command-resources.js';
import type {CommandResourceRepository} from '../../ports/repositories.js';

type ReservationRow = typeof commandResourceReservations.$inferSelect;

function mapReservation(row: ReservationRow): CommandResourceReservation {
    return {
        id: row.id,
        userId: row.userId,
        pluginId: row.pluginId,
        messageId: row.messageId,
        limitAmount: row.limitAmount,
        moneyAmount: row.moneyAmount,
        requiredLevel: row.requiredLevel,
        status: row.status as CommandResourceReservation['status'],
        releaseReason: row.releaseReason,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        expiresAt: row.expiresAt,
    };
}

export const commandResourceRepository: CommandResourceRepository = {
    async reserve(input) {
        if (!input.limit && !input.money && !input.level) return {kind: 'not_required'};

        return orm.transaction(async tx => {
            const [inserted] = await tx.insert(commandResourceReservations).values({
                id: input.id,
                userId: input.userId,
                pluginId: input.pluginId,
                messageId: input.messageId,
                limitAmount: input.limit,
                moneyAmount: input.money,
                requiredLevel: input.level,
                expiresAt: input.expiresAt,
            }).onConflictDoNothing().returning();

            if (!inserted) {
                const [existing] = await tx.select().from(commandResourceReservations)
                    .where(eq(commandResourceReservations.id, input.id)).limit(1);
                if (existing) {
                    return {kind: 'reserved' as const, reservation: mapReservation(existing), duplicate: true};
                }
                return {kind: 'not_required' as const};
            }

            const [debited] = await tx.update(usuarios).set({
                limite: sql`${usuarios.limite} - ${input.limit}`,
                money: sql`${usuarios.money} - ${input.money}`,
            }).where(and(
                eq(usuarios.id, input.userId),
                sql`COALESCE(${usuarios.limite}, 0) >= ${input.limit}`,
                sql`COALESCE(${usuarios.money}, 0) >= ${input.money}`,
                sql`COALESCE(${usuarios.level}, 0) >= ${input.level}`,
            )).returning({id: usuarios.id});

            if (debited) return {kind: 'reserved' as const, reservation: mapReservation(inserted), duplicate: false};

            const [resources] = await tx.select({
                limite: usuarios.limite,
                money: usuarios.money,
                level: usuarios.level,
            }).from(usuarios).where(eq(usuarios.id, input.userId)).limit(1);
            await tx.delete(commandResourceReservations).where(eq(commandResourceReservations.id, input.id));

            const availableLimit = resources?.limite ?? 0;
            const availableMoney = resources?.money ?? 0;
            const availableLevel = resources?.level ?? 0;
            if (availableLevel < input.level) return {kind: 'insufficient_level' as const, available: availableLevel, required: input.level};
            if (availableLimit < input.limit) return {kind: 'insufficient_limit' as const, available: availableLimit, required: input.limit};
            return {kind: 'insufficient_money' as const, available: availableMoney, required: input.money};
        });
    },

    async commit(id) {
        const [row] = await orm.update(commandResourceReservations)
            .set({status: 'committed', updatedAt: new Date()})
            .where(and(eq(commandResourceReservations.id, id), eq(commandResourceReservations.status, 'pending')))
            .returning();
        return row ? mapReservation(row) : null;
    },

    async release(id, reason) {
        return orm.transaction(async tx => {
            const [row] = await tx.update(commandResourceReservations)
                .set({status: 'released', releaseReason: reason, updatedAt: new Date()})
                .where(and(eq(commandResourceReservations.id, id), eq(commandResourceReservations.status, 'pending')))
                .returning();
            if (!row) return null;
            await tx.update(usuarios).set({
                limite: sql`${usuarios.limite} + ${row.limitAmount}`,
                money: sql`${usuarios.money} + ${row.moneyAmount}`,
            }).where(eq(usuarios.id, row.userId));
            return mapReservation(row);
        });
    },

    async releaseExpired(now) {
        const expired = await orm.select({id: commandResourceReservations.id})
            .from(commandResourceReservations)
            .where(and(eq(commandResourceReservations.status, 'pending'), lte(commandResourceReservations.expiresAt, now)));
        let released = 0;
        for (const {id} of expired) {
            if (await this.release(id, 'expired')) released++;
        }
        return released;
    },
};
