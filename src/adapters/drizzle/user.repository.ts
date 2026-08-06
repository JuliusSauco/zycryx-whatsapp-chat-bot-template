import {and, eq, getTableColumns, ne, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {userBankAccounts, userWallets, usuarios, walletTransactions} from '../../db/schema.js';
import type {UserRepository} from '../../ports/repositories.js';

import {walletUserRepositoryMethods} from './user-wallet.repository.js';
import {mapUserRecord} from './user.mapper.js';

export const userRepository: UserRepository = {
    async findById(userId) {
        const [row] = await orm.select({
            ...getTableColumns(usuarios),
            limite: userWallets.limite,
            exp: userWallets.exp,
            coins: userWallets.coins,
            botcoin: userWallets.botcoin,
            zyxcoin: userWallets.zyxcoin,
        }).from(usuarios).leftJoin(userWallets, eq(userWallets.userId, usuarios.id))
            .where(eq(usuarios.id, userId)).limit(1);
        return row ? mapUserRecord(row) : null;
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

    async upsertBasicUser({id, nombre, username, num}) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios)
                .values({id, nombre, username: username ?? null, num, registered: false})
                .onConflictDoUpdate({
                    target: usuarios.id,
                    set: {
                        nombre: sql`
                            CASE
                                WHEN excluded.nombre IS NULL OR excluded.nombre = 'sin name' THEN ${usuarios.nombre}
                                WHEN ${usuarios.nombre} IS NULL OR ${usuarios.nombre} = 'sin name' OR ${usuarios.nombre} LIKE 'admin_%' THEN excluded.nombre
                                ELSE excluded.nombre
                            END
                        `,
                        ...(username !== undefined ? {username} : {}),
                        num: sql`COALESCE(${usuarios.num}, excluded.num)`,
                    },
                });
            const [wallet] = await tx.insert(userWallets).values({userId: id})
                .onConflictDoNothing().returning();
            await tx.insert(userBankAccounts).values({userId: id}).onConflictDoNothing();
            if (wallet) await tx.insert(walletTransactions).values([
                {userId: id, resource: 'limite', amount: wallet.limite, balanceAfter: wallet.limite, reason: 'opening_balance', operation: 'user_creation'},
                {userId: id, resource: 'coins', amount: wallet.coins, balanceAfter: wallet.coins, reason: 'opening_balance', operation: 'user_creation'},
            ]);
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

    async upsertRegisteredAdmin({id, nombre, num, lid, serialNumber}) {
        const updates = {
            nombre: sql`
                CASE
                    WHEN excluded.nombre IS NULL OR excluded.nombre = 'sin name' THEN ${usuarios.nombre}
                    WHEN excluded.nombre LIKE 'admin_%' AND ${usuarios.nombre} IS NOT NULL THEN ${usuarios.nombre}
                    WHEN ${usuarios.nombre} IS NULL OR ${usuarios.nombre} = 'sin name' OR ${usuarios.nombre} LIKE 'admin_%' THEN excluded.nombre
                    ELSE ${usuarios.nombre}
                END
            `,
            num: sql`COALESCE(${usuarios.num}, excluded.num)`,
            registered: true,
            serialNumber: sql`COALESCE(${usuarios.serialNumber}, excluded.serial_number)`,
            regTime: sql`COALESCE(${usuarios.regTime}, excluded.reg_time)`,
            ...(lid ? {lid} : {}),
        };

        await orm.transaction(async tx => {
            await tx.insert(usuarios)
                .values({
                    id, nombre: nombre || id.split('@')[0], num, lid: lid || null,
                    registered: true, serialNumber, regTime: new Date(),
                })
                .onConflictDoUpdate({target: usuarios.id, set: updates});
            const [wallet] = await tx.insert(userWallets).values({userId: id}).onConflictDoNothing().returning();
            await tx.insert(userBankAccounts).values({userId: id}).onConflictDoNothing();
            if (wallet) await tx.insert(walletTransactions).values([
                {userId: id, resource: 'limite', amount: wallet.limite, balanceAfter: wallet.limite, reason: 'opening_balance', operation: 'admin_creation'},
                {userId: id, resource: 'coins', amount: wallet.coins, balanceAfter: wallet.coins, reason: 'opening_balance', operation: 'admin_creation'},
            ]);
        });
    },

    async completeRegistration({id, nombre, edad, gender, birthday, regTime, serialNumber}) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({
                id, nombre, edad, gender, birthday, regTime, registered: true, serialNumber,
            }).onConflictDoUpdate({
                target: usuarios.id,
                set: {nombre, edad, gender, birthday, regTime, registered: true, serialNumber},
            });
            const [createdWallet] = await tx.insert(userWallets).values({userId: id})
                .onConflictDoNothing().returning();
            await tx.insert(userBankAccounts).values({userId: id}).onConflictDoNothing();
            if (createdWallet) await tx.insert(walletTransactions).values([
                {userId: id, resource: 'limite', amount: createdWallet.limite, balanceAfter: createdWallet.limite, reason: 'opening_balance', operation: 'registration_creation'},
                {userId: id, resource: 'coins', amount: createdWallet.coins, balanceAfter: createdWallet.coins, reason: 'opening_balance', operation: 'registration_creation'},
            ]);
            const [wallet] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, id)).for('update').limit(1);
            if (!wallet) return;
            const limite = wallet.limite + 2;
            const exp = wallet.exp + 150;
            const coins = wallet.coins + 400;
            await tx.update(userWallets).set({limite, exp, coins, updatedAt: new Date()})
                .where(eq(userWallets.userId, id));
            await tx.insert(walletTransactions).values([
                {userId: id, resource: 'limite', amount: 2, balanceAfter: limite, reason: 'registration', operation: 'register'},
                {userId: id, resource: 'exp', amount: 150, balanceAfter: exp, reason: 'registration', operation: 'register'},
                {userId: id, resource: 'coins', amount: 400, balanceAfter: coins, reason: 'registration', operation: 'register'},
            ]);
        });
    },

    async unregister(userId) {
        await orm.transaction(async tx => {
            await tx.update(usuarios).set({
                registered: false, nombre: null, edad: null, regTime: null, serialNumber: null,
            }).where(eq(usuarios.id, userId));
            const [wallet] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            if (!wallet) return;
            const limite = Math.max(0, wallet.limite - 2);
            const exp = Math.max(0, wallet.exp - 150);
            const coins = Math.max(0, wallet.coins - 400);
            await tx.update(userWallets).set({limite, exp, coins, updatedAt: new Date()})
                .where(eq(userWallets.userId, userId));
            const entries = [
                {resource: 'limite', amount: limite - wallet.limite, balanceAfter: limite},
                {resource: 'exp', amount: exp - wallet.exp, balanceAfter: exp},
                {resource: 'coins', amount: coins - wallet.coins, balanceAfter: coins},
            ].filter(entry => entry.amount !== 0).map(entry => ({
                userId, ...entry, reason: 'unregistration', operation: 'unregister',
            }));
            if (entries.length) await tx.insert(walletTransactions).values(entries);
        });
    },

    async setGender(userId, gender) {
        const [updated] = await orm.update(usuarios)
            .set({gender})
            .where(eq(usuarios.id, userId))
            .returning({id: usuarios.id});
        return !!updated;
    },

    async setBirthday(userId, birthday) {
        const [updated] = await orm.update(usuarios)
            .set({birthday})
            .where(eq(usuarios.id, userId))
            .returning({id: usuarios.id});
        return !!updated;
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
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id: userId, warnPv: warned})
                .onConflictDoUpdate({target: usuarios.id, set: {warnPv: warned}});
            const [wallet] = await tx.insert(userWallets).values({userId}).onConflictDoNothing().returning();
            await tx.insert(userBankAccounts).values({userId}).onConflictDoNothing();
            if (wallet) await tx.insert(walletTransactions).values([
                {userId, resource: 'limite', amount: wallet.limite, balanceAfter: wallet.limite, reason: 'opening_balance', operation: 'private_warning_creation'},
                {userId, resource: 'coins', amount: wallet.coins, balanceAfter: wallet.coins, reason: 'opening_balance', operation: 'private_warning_creation'},
            ]);
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
