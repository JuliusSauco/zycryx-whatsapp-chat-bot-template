import {and, eq, ne, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {usuarios} from '../../db/schema.js';
import type {UserRepository} from '../../ports/repositories.js';

import {walletUserRepositoryMethods} from './user-wallet.repository.js';

export const userRepository: UserRepository = {
    async findById(userId) {
        const [row] = await orm.select().from(usuarios).where(eq(usuarios.id, userId)).limit(1);
        return row ?? null;
    },

    async findNameById(userId) {
        const [row] = await orm
            .select({nombre: usuarios.nombre})
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);
        return row?.nombre ?? null;
    },

    ...walletUserRepositoryMethods,

    async findBanInfo(userId) {
        const [row] = await orm
            .select({
                banned: usuarios.banned,
                razon_ban: usuarios.razonBan,
                avisos_ban: usuarios.avisosBan,
            })
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);

        return row
            ? {
                banned: !!row.banned,
                razon_ban: row.razon_ban ?? null,
                avisos_ban: row.avisos_ban ?? 0,
            }
            : null;
    },

    async incrementBanNotice(userId, notices) {
        await orm.update(usuarios)
            .set({avisosBan: notices})
            .where(eq(usuarios.id, userId));
    },

    async setBanStatus(userId, banned, reason) {
        await orm.update(usuarios)
            .set(banned
                ? {banned: true, razonBan: reason}
                : {banned: false, razonBan: null, avisosBan: 0})
            .where(eq(usuarios.id, userId));
    },

    async upsertBasicUser({id, nombre, num}) {
        await orm.insert(usuarios)
            .values({id, nombre, num, registered: false})
            .onConflictDoUpdate({
                target: usuarios.id,
                set: {
                    nombre: sql`excluded.nombre`,
                    num: sql`COALESCE(${usuarios.num}, excluded.num)`,
                },
            });
    },

    async clearLidFromOtherUsers(lid, userId) {
        await orm.update(usuarios)
            .set({lid: null})
            .where(and(eq(usuarios.lid, lid), ne(usuarios.id, userId)));
    },

    async setUserLid(userId, lid) {
        await orm.update(usuarios)
            .set({lid})
            .where(eq(usuarios.id, userId));
    },

    async completeRegistration({id, nombre, edad, gender, birthday, regTime, serialNumber}) {
        await orm.insert(usuarios)
            .values({
                id,
                nombre,
                edad,
                gender,
                birthday,
                money: 400,
                limite: 2,
                exp: 150,
                regTime,
                registered: true,
                serialNumber,
            })
            .onConflictDoUpdate({
                target: usuarios.id,
                set: {
                    nombre,
                    edad,
                    gender,
                    birthday,
                    money: sql`${usuarios.money} + 400`,
                    limite: sql`${usuarios.limite} + 2`,
                    exp: sql`${usuarios.exp} + 150`,
                    regTime,
                    registered: true,
                    serialNumber,
                },
            });
    },

    async unregister(userId) {
        await orm.update(usuarios)
            .set({
                registered: false,
                nombre: null,
                edad: null,
                money: sql`${usuarios.money} - 400`,
                limite: sql`${usuarios.limite} - 2`,
                exp: sql`${usuarios.exp} - 150`,
                regTime: null,
                serialNumber: null,
            })
            .where(eq(usuarios.id, userId));
    },

    async setGender(userId, gender) {
        await orm.update(usuarios)
            .set({gender})
            .where(eq(usuarios.id, userId));
    },

    async setBirthday(userId, birthday) {
        await orm.update(usuarios)
            .set({birthday})
            .where(eq(usuarios.id, userId));
    },

    async countUsers() {
        const [row] = await orm
            .select({
                total: sql<number>`COUNT(*)::int`,
                registered: sql<number>`COUNT(*) FILTER (WHERE ${usuarios.registered} = true)::int`,
            })
            .from(usuarios);

        return {
            total: row?.total ?? 0,
            registered: row?.registered ?? 0,
        };
    },

    async findStickerSettings(userId) {
        const [row] = await orm
            .select({
                sticker_packname: usuarios.stickerPackname,
                sticker_author: usuarios.stickerAuthor,
            })
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);

        return row ?? null;
    },

    async setStickerSettings(userId, packname, author) {
        await orm.update(usuarios)
            .set({stickerPackname: packname, stickerAuthor: author})
            .where(eq(usuarios.id, userId));
    },

    async findWarnInfo(userId) {
        const [row] = await orm
            .select({id: usuarios.id, warn: usuarios.warn})
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);

        return row ? {id: row.id, warn: row.warn ?? 0} : null;
    },

    async incrementWarn(userId) {
        await orm.update(usuarios)
            .set({warn: sql`${usuarios.warn} + 1`})
            .where(eq(usuarios.id, userId));
    },

    async decrementWarn(userId) {
        await orm.update(usuarios)
            .set({warn: sql`GREATEST(${usuarios.warn} - 1, 0)`})
            .where(eq(usuarios.id, userId));
    },

    async resetWarn(userId) {
        await orm.update(usuarios)
            .set({warn: 0})
            .where(eq(usuarios.id, userId));
    },

    async listWarnedUsers() {
        const rows = await orm
            .select({id: usuarios.id, warn: usuarios.warn})
            .from(usuarios)
            .where(sql`${usuarios.warn} > 0`);

        return rows.map(row => ({id: row.id, warn: row.warn ?? 0}));
    },

    async findNumberByLid(lid) {
        const [row] = await orm
            .select({num: usuarios.num})
            .from(usuarios)
            .where(eq(usuarios.lid, lid))
            .limit(1);

        return row?.num ?? null;
    },

    async listBannedUsers() {
        const rows = await orm
            .select({
                id: usuarios.id,
                razon_ban: usuarios.razonBan,
                avisos_ban: usuarios.avisosBan,
            })
            .from(usuarios)
            .where(eq(usuarios.banned, true));

        return rows.map(row => ({
            id: row.id,
            razon_ban: row.razon_ban ?? null,
            avisos_ban: row.avisos_ban ?? 0,
        }));
    },

    async listMarriedUsers() {
        const rows = await orm
            .select({id: usuarios.id, marry: usuarios.marry})
            .from(usuarios)
            .where(sql`${usuarios.marry} IS NOT NULL`);

        return rows.map(row => ({id: row.id, marry: row.marry ?? null}));
    },

    async getPrivateWarn(userId) {
        const [row] = await orm
            .select({warnPv: usuarios.warnPv})
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);

        return row ? !!row.warnPv : null;
    },

    async setPrivateWarn(userId, warned) {
        await orm.insert(usuarios)
            .values({id: userId, warnPv: warned})
            .onConflictDoUpdate({
                target: usuarios.id,
                set: {warnPv: warned},
            });
    },

    async setMarriageRequest(userId, requesterId) {
        await orm.update(usuarios)
            .set({marryRequest: requesterId})
            .where(eq(usuarios.id, userId));
    },

    async getMarriageRequest(userId) {
        const [row] = await orm
            .select({marryRequest: usuarios.marryRequest})
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);

        return row?.marryRequest ?? null;
    },

    async marryUsers(userA, userB) {
        await orm.transaction(async tx => {
            await tx.update(usuarios)
                .set({marry: userB, marryRequest: null})
                .where(eq(usuarios.id, userA));
            await tx.update(usuarios)
                .set({marry: userA})
                .where(eq(usuarios.id, userB));
        });
    },

    async divorceUsers(userA, userB) {
        await orm.transaction(async tx => {
            await tx.update(usuarios)
                .set({marry: null})
                .where(eq(usuarios.id, userA));
            await tx.update(usuarios)
                .set({marry: null})
                .where(eq(usuarios.id, userB));
        });
    },
};
