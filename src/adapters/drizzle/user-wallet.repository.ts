import {asc, eq, inArray, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {usuarios} from '../../db/schema.js';
import type {RewardTimestampField, UserRepository, WalletResource} from '../../ports/repositories.js';
import {mapUserResources, mapUserWallet} from './user.mapper.js';
import {
    getMaxRobExp,
    getRandomRobExp,
    getRequiredRobLevel,
    isValidRobAmount,
    ROB_COOLDOWN_MS,
} from '../../domain/robbery.js';

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

export const walletUserRepositoryMethods: Pick<UserRepository, 'findWallet' | 'listWallets' | 'getResources' | 'addWalletResource' | 'addWalletResourceAndSetWait' | 'addWalletResourcesAndSetFields' | 'exchangeWalletResources' | 'transferWalletResource' | 'robExperience' | 'setLevelRole' | 'decrementLimit' | 'decrementMoney'> = {
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

        return row ? mapUserWallet(row) : null;
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

        return rows.map(mapUserWallet);
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

        return mapUserResources(row);
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

    async robExperience({robberId, victimId, amount, attemptedAt, cooldownMs = ROB_COOLDOWN_MS}) {
        if (robberId === victimId) return {kind: 'same_user'};
        if (amount !== undefined && !isValidRobAmount(amount)) return {kind: 'invalid_amount'};

        return orm.transaction(async tx => {
            // El orden estable evita deadlocks cuando dos usuarios intentan robarse al mismo tiempo.
            const rows = await tx
                .select({
                    id: usuarios.id,
                    exp: usuarios.exp,
                    level: usuarios.level,
                    lastrob: usuarios.lastrob,
                })
                .from(usuarios)
                .where(inArray(usuarios.id, [robberId, victimId]))
                .orderBy(asc(usuarios.id))
                .for('update');

            const robber = rows.find(row => row.id === robberId);
            const victim = rows.find(row => row.id === victimId);
            if (!robber) return {kind: 'missing_robber'} as const;
            if (!victim) return {kind: 'missing_victim'} as const;

            const remainingMs = (robber.lastrob ?? 0) + Math.max(0, cooldownMs) - attemptedAt;
            if (remainingMs > 0) return {kind: 'cooldown', remainingMs} as const;

            const availableLevel = Math.max(0, robber.level ?? 0);
            const maxAmount = getMaxRobExp(availableLevel);
            const requestedAmount = amount ?? getRandomRobExp(availableLevel);
            const requiredLevel = getRequiredRobLevel(requestedAmount);
            if (requiredLevel === 0 || availableLevel < requiredLevel) {
                return {
                    kind: 'insufficient_level',
                    availableLevel,
                    requiredLevel: Math.max(1, requiredLevel),
                    maxAmount,
                } as const;
            }

            const victimExp = Math.max(0, victim.exp ?? 0);
            if (victimExp < requestedAmount) {
                return {kind: 'insufficient_victim_exp', available: victimExp, required: requestedAmount} as const;
            }

            await tx.update(usuarios)
                .set({exp: sql`COALESCE(${usuarios.exp}, 0) - ${requestedAmount}`})
                .where(eq(usuarios.id, victimId));
            await tx.update(usuarios)
                .set({
                    exp: sql`COALESCE(${usuarios.exp}, 0) + ${requestedAmount}`,
                    lastrob: attemptedAt,
                })
                .where(eq(usuarios.id, robberId));

            return {kind: 'success', amount: requestedAmount, maxAmount} as const;
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
