import type {usuarios} from '../../db/schema.js';
import type {UserRecord, UserResources, UserWallet} from '../../domain/users.js';

export type UserRow = typeof usuarios.$inferSelect;
export type UserRecordRow = Pick<UserRow, 'id' | 'nombre'> & {
    username?: string | null;
    registered?: boolean | null;
    num?: string | null;
    lid?: string | null;
    banned?: boolean | null;
    razonBan?: string | null;
    avisosBan?: number | null;
    warnPv?: boolean | null;
    warn?: number | null;
    warnAntiporn?: number | null;
    warnEstado?: number | null;
    edad?: number | null;
    gender?: string | null;
    birthday?: string | null;
    level?: number | null;
    role?: string | null;
    roleDescription?: string | null;
    regTime?: Date | null;
    serialNumber?: string | null;
    stickerPackname?: string | null;
    stickerAuthor?: string | null;
    ryTime?: number | null;
    lastwork?: number | null;
    lastmiming?: number | null;
    lastclaim?: number | null;
    dailystreak?: number | null;
    lastcofre?: number | null;
    lastrob?: number | null;
    lastslut?: number | null;
    timevot?: number | null;
    wait?: number | null;
    crime?: number | null;
    marry?: string | null;
    marryRequest?: string | null;
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
        username: row.username ?? null,
        registered: booleanOrFalse(row.registered),
        num: row.num ?? null,
        lid: row.lid ?? null,
        banned: booleanOrFalse(row.banned),
        razonBan: row.razonBan ?? null,
        avisosBan: numberOrZero(row.avisosBan),
        warnPv: booleanOrFalse(row.warnPv),
        warn: numberOrZero(row.warn),
        warnAntiporn: numberOrZero(row.warnAntiporn),
        warnEstado: numberOrZero(row.warnEstado),
        edad: row.edad ?? null,
        gender: row.gender ?? null,
        birthday: row.birthday ?? null,
        coins: numberOrZero(row.coins),
        limite: numberOrZero(row.limite),
        exp: numberOrZero(row.exp),
        botcoin: numberOrZero(row.botcoin),
        zyxcoin: numberOrZero(row.zyxcoin),
        level: numberOrZero(row.level),
        role: row.role ?? 'novato',
        roleDescription: row.roleDescription ?? null,
        regTime: row.regTime ?? null,
        serialNumber: row.serialNumber ?? null,
        serial_number: row.serialNumber ?? null,
        stickerPackname: row.stickerPackname ?? null,
        stickerAuthor: row.stickerAuthor ?? null,
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
        marry: row.marry ?? null,
        marryRequest: row.marryRequest ?? null,
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
