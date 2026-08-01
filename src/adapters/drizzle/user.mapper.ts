import type {usuarios} from '../../db/schema.js';
import type {UserRecord, UserResources, UserWallet} from '../../domain/users.js';

export type UserRow = typeof usuarios.$inferSelect;

export type UserWalletRow = Pick<
    UserRow,
    | 'id'
    | 'nombre'
    | 'limite'
    | 'exp'
    | 'money'
    | 'banco'
    | 'level'
    | 'role'
    | 'wait'
    | 'lastclaim'
    | 'dailystreak'
    | 'lastcofre'
    | 'lastmiming'
    | 'lastwork'
    | 'crime'
    | 'lastrob'
    | 'lastslut'
    | 'timevot'
    | 'ryTime'
>;

export type UserResourcesRow = Pick<UserRow, 'limite' | 'money' | 'level'> | undefined;

function numberOrZero(value: number | null | undefined): number {
    return value ?? 0;
}

function booleanOrFalse(value: boolean | null | undefined): boolean {
    return value ?? false;
}

export function mapUserRecord(row: UserRow): UserRecord {
    return {
        id: row.id,
        nombre: row.nombre,
        username: row.username,
        registered: booleanOrFalse(row.registered),
        num: row.num,
        lid: row.lid,
        banned: booleanOrFalse(row.banned),
        razonBan: row.razonBan,
        avisosBan: numberOrZero(row.avisosBan),
        warnPv: booleanOrFalse(row.warnPv),
        warn: numberOrZero(row.warn),
        warnAntiporn: numberOrZero(row.warnAntiporn),
        warnEstado: numberOrZero(row.warnEstado),
        edad: row.edad,
        gender: row.gender,
        birthday: row.birthday,
        money: numberOrZero(row.money),
        limite: numberOrZero(row.limite),
        exp: numberOrZero(row.exp),
        banco: numberOrZero(row.banco),
        level: numberOrZero(row.level),
        role: row.role ?? 'novato',
        roleDescription: row.roleDescription,
        regTime: row.regTime,
        serialNumber: row.serialNumber,
        serial_number: row.serialNumber,
        stickerPackname: row.stickerPackname,
        stickerAuthor: row.stickerAuthor,
        ryTime: numberOrZero(row.ryTime),
        lastwork: numberOrZero(row.lastwork),
        lastmiming: numberOrZero(row.lastmiming),
        lastclaim: numberOrZero(row.lastclaim),
        dailystreak: numberOrZero(row.dailystreak),
        lastcofre: numberOrZero(row.lastcofre),
        lastrob: numberOrZero(row.lastrob),
        lastslut: numberOrZero(row.lastslut),
        timevot: numberOrZero(row.timevot),
        wait: numberOrZero(row.wait),
        crime: numberOrZero(row.crime),
        marry: row.marry,
        marryRequest: row.marryRequest,
    };
}

export function mapUserWallet(row: UserWalletRow): UserWallet {
    return {
        id: row.id,
        nombre: row.nombre,
        limite: numberOrZero(row.limite),
        exp: numberOrZero(row.exp),
        money: numberOrZero(row.money),
        banco: numberOrZero(row.banco),
        level: numberOrZero(row.level),
        role: row.role ?? 'novato',
        wait: numberOrZero(row.wait),
        lastclaim: numberOrZero(row.lastclaim),
        dailystreak: numberOrZero(row.dailystreak),
        lastcofre: numberOrZero(row.lastcofre),
        lastmiming: numberOrZero(row.lastmiming),
        lastwork: numberOrZero(row.lastwork),
        crime: numberOrZero(row.crime),
        lastrob: numberOrZero(row.lastrob),
        lastslut: numberOrZero(row.lastslut),
        timevot: numberOrZero(row.timevot),
        ryTime: numberOrZero(row.ryTime),
    };
}

export function mapUserResources(row: UserResourcesRow): UserResources {
    return {
        limite: numberOrZero(row?.limite),
        money: numberOrZero(row?.money),
        level: numberOrZero(row?.level),
    };
}
