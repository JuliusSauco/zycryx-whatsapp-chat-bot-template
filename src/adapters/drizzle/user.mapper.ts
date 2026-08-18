import type {userWallets, usuarios} from '../../db/schema.js';
import type {UserRecord, UserResources, UserWallet} from '../../domain/users.js';

export type UserRow = typeof usuarios.$inferSelect;
export type WalletRow = typeof userWallets.$inferSelect;
export type UserRecordRow = UserRow & {
    limite?: number | null;
    exp?: number | null;
    coins?: number | null;
    botcoin?: number | null;
    zyxcoin?: number | null;
};

export interface UserWalletRow {
    id: string;
    nombre: string | null;
    limite: number | null;
    exp: number | null;
    coins: number | null;
    botcoin: number | null;
    zyxcoin: number | null;
    level: number | null;
    role: string | null;
    wait: number | null;
    lastclaim: number | null;
    dailystreak: number | null;
    lastcofre: number | null;
    lastmiming: number | null;
    lastwork: number | null;
    crime: number | null;
    lastrob: number | null;
    lastslut: number | null;
    timevot: number | null;
    ryTime: number | null;
}

export interface UserResourcesRow {
    limite: number | null;
    coins: number | null;
    level: number | null;
}

function numberOrZero(value: number | null | undefined): number {
    return value ?? 0;
}

function booleanOrFalse(value: boolean | null | undefined): boolean {
    return value ?? false;
}

export function mapUserRecord(row: UserRecordRow): UserRecord {
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
        coins: numberOrZero(row.coins),
        limite: numberOrZero(row.limite),
        exp: numberOrZero(row.exp),
        botcoin: numberOrZero(row.botcoin),
        zyxcoin: numberOrZero(row.zyxcoin),
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
        coins: numberOrZero(row.coins),
        botcoin: numberOrZero(row.botcoin),
        zyxcoin: numberOrZero(row.zyxcoin),
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

export function mapUserResources(row: UserResourcesRow | undefined): UserResources {
    return {
        limite: numberOrZero(row?.limite),
        coins: numberOrZero(row?.coins),
        level: numberOrZero(row?.level),
    };
}
