import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {usuarios} from '../../db/schema.js';
import type {RewardTimestampField, UserRepository, WalletResource} from '../../ports/repositories.js';

function walletColumn(resource: WalletResource) {
    const columns = {
        limite: usuarios.limite,
        exp: usuarios.exp,
        money: usuarios.money,
        banco: usuarios.banco,
    } as const;

    return columns[resource];
}

function walletProperty(resource: WalletResource) {
    const properties = {
        limite: 'limite',
        exp: 'exp',
        money: 'money',
        banco: 'banco',
    } as const;

    return properties[resource];
}

function rewardFieldProperty(field: RewardTimestampField) {
    const properties = {
        lastclaim: 'lastclaim',
        dailystreak: 'dailystreak',
        lastcofre: 'lastcofre',
        lastmiming: 'lastmiming',
        lastwork: 'lastwork',
        crime: 'crime',
        lastrob: 'lastrob',
        lastslut: 'lastslut',
        timevot: 'timevot',
        ryTime: 'ryTime',
    } as const;

    return properties[field];
}

export const walletUserRepositoryMethods: Pick<UserRepository, 'findWallet' | 'listWallets' | 'getResources' | 'addWalletResource' | 'addWalletResourceAndSetWait' | 'addWalletResourcesAndSetFields' | 'exchangeWalletResources' | 'transferWalletResource' | 'setLevelRole' | 'decrementLimit' | 'decrementMoney'> = {
    async findWallet(userId) {
        const [row] = await orm
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                limite: usuarios.limite,
                exp: usuarios.exp,
                money: usuarios.money,
                banco: usuarios.banco,
                level: usuarios.level,
                role: usuarios.role,
                wait: usuarios.wait,
                lastclaim: usuarios.lastclaim,
                dailystreak: usuarios.dailystreak,
                lastcofre: usuarios.lastcofre,
                lastmiming: usuarios.lastmiming,
                lastwork: usuarios.lastwork,
                crime: usuarios.crime,
                lastrob: usuarios.lastrob,
                lastslut: usuarios.lastslut,
                timevot: usuarios.timevot,
                ryTime: usuarios.ryTime,
            })
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);

        return row
            ? {
                id: row.id,
                nombre: row.nombre,
                limite: row.limite ?? 0,
                exp: row.exp ?? 0,
                money: row.money ?? 0,
                banco: row.banco ?? 0,
                level: row.level ?? 0,
                role: row.role ?? 'novato',
                wait: row.wait ?? 0,
                lastclaim: row.lastclaim ?? 0,
                dailystreak: row.dailystreak ?? 0,
                lastcofre: row.lastcofre ?? 0,
                lastmiming: row.lastmiming ?? 0,
                lastwork: row.lastwork ?? 0,
                crime: row.crime ?? 0,
                lastrob: row.lastrob ?? 0,
                lastslut: row.lastslut ?? 0,
                timevot: row.timevot ?? 0,
                ryTime: row.ryTime ?? 0,
            }
            : null;
    },

    async listWallets() {
        const rows = await orm
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                limite: usuarios.limite,
                exp: usuarios.exp,
                money: usuarios.money,
                banco: usuarios.banco,
                level: usuarios.level,
                role: usuarios.role,
                wait: usuarios.wait,
                lastclaim: usuarios.lastclaim,
                dailystreak: usuarios.dailystreak,
                lastcofre: usuarios.lastcofre,
                lastmiming: usuarios.lastmiming,
                lastwork: usuarios.lastwork,
                crime: usuarios.crime,
                lastrob: usuarios.lastrob,
                lastslut: usuarios.lastslut,
                timevot: usuarios.timevot,
                ryTime: usuarios.ryTime,
            })
            .from(usuarios);

        return rows.map(row => ({
            id: row.id,
            nombre: row.nombre,
            limite: row.limite ?? 0,
            exp: row.exp ?? 0,
            money: row.money ?? 0,
            banco: row.banco ?? 0,
            level: row.level ?? 0,
            role: row.role ?? 'novato',
            wait: row.wait ?? 0,
            lastclaim: row.lastclaim ?? 0,
            dailystreak: row.dailystreak ?? 0,
            lastcofre: row.lastcofre ?? 0,
            lastmiming: row.lastmiming ?? 0,
            lastwork: row.lastwork ?? 0,
            crime: row.crime ?? 0,
            lastrob: row.lastrob ?? 0,
            lastslut: row.lastslut ?? 0,
            timevot: row.timevot ?? 0,
            ryTime: row.ryTime ?? 0,
        }));
    },

    async getResources(userId) {
        const [row] = await orm
            .select({
                limite: usuarios.limite,
                money: usuarios.money,
                level: usuarios.level,
            })
            .from(usuarios)
            .where(eq(usuarios.id, userId))
            .limit(1);

        return {
            limite: row?.limite ?? 0,
            money: row?.money ?? 0,
            level: row?.level ?? 0,
        };
    },

    async addWalletResource(userId, resource, amount) {
        const column = walletColumn(resource);
        const property = walletProperty(resource);
        const expression = amount >= 0
            ? sql`${column} + ${amount}`
            : sql`GREATEST(${column} + ${amount}, 0)`;

        const [row] = await orm.update(usuarios)
            .set({[property]: expression})
            .where(eq(usuarios.id, userId))
            .returning({value: column});

        return row?.value ?? null;
    },

    async addWalletResourceAndSetWait(userId, resource, amount, wait) {
        const column = walletColumn(resource);
        const property = walletProperty(resource);
        const expression = amount >= 0
            ? sql`${column} + ${amount}`
            : sql`GREATEST(${column} + ${amount}, 0)`;

        const [row] = await orm.update(usuarios)
            .set({[property]: expression, wait})
            .where(eq(usuarios.id, userId))
            .returning({value: column});

        return row?.value ?? null;
    },

    async addWalletResourcesAndSetFields({userId, resources, fields}) {
        const set: Record<string, unknown> = {};

        for (const [resource, amount] of Object.entries(resources) as Array<[WalletResource, number]>) {
            const column = walletColumn(resource);
            const property = walletProperty(resource);
            set[property] = amount >= 0
                ? sql`${column} + ${amount}`
                : sql`GREATEST(${column} + ${amount}, 0)`;
        }

        for (const [field, value] of Object.entries(fields) as Array<[RewardTimestampField, number]>) {
            set[rewardFieldProperty(field)] = value;
        }

        await orm.update(usuarios)
            .set(set)
            .where(eq(usuarios.id, userId));
    },

    async exchangeWalletResources({userId, from, to, fromAmount, toAmount}) {
        const fromColumn = walletColumn(from);
        const toColumn = walletColumn(to);
        const fromProperty = walletProperty(from);
        const toProperty = walletProperty(to);

        return orm.transaction(async tx => {
            const [row] = await tx
                .select({value: fromColumn})
                .from(usuarios)
                .where(eq(usuarios.id, userId))
                .limit(1);

            if (!row || (row.value ?? 0) < fromAmount) return false;

            await tx.update(usuarios)
                .set({
                    [fromProperty]: sql`${fromColumn} - ${fromAmount}`,
                    [toProperty]: sql`${toColumn} + ${toAmount}`,
                })
                .where(eq(usuarios.id, userId));

            return true;
        });
    },

    async transferWalletResource({from, to, resource, amount}) {
        const column = walletColumn(resource);
        const property = walletProperty(resource);

        return orm.transaction(async tx => {
            const [sender] = await tx
                .select({value: column})
                .from(usuarios)
                .where(eq(usuarios.id, from))
                .limit(1);
            const [receiver] = await tx
                .select({id: usuarios.id})
                .from(usuarios)
                .where(eq(usuarios.id, to))
                .limit(1);

            if (!sender || !receiver || (sender.value ?? 0) < amount) return false;

            await tx.update(usuarios)
                .set({[property]: sql`${column} - ${amount}`})
                .where(eq(usuarios.id, from));
            await tx.update(usuarios)
                .set({[property]: sql`${column} + ${amount}`})
                .where(eq(usuarios.id, to));

            return true;
        });
    },

    async setLevelRole(userId, level, role) {
        await orm.update(usuarios)
            .set({level, role})
            .where(eq(usuarios.id, userId));
    },

    async decrementLimit(userId, amount) {
        await orm.update(usuarios)
            .set({limite: sql`${usuarios.limite} - ${amount}`})
            .where(eq(usuarios.id, userId));
    },

    async decrementMoney(userId, amount) {
        await orm.update(usuarios)
            .set({money: sql`${usuarios.money} - ${amount}`})
            .where(eq(usuarios.id, userId));
    }
};
