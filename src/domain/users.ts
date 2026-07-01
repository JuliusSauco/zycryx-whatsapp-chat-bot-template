export interface UserBanInfo {
    banned: boolean;
    razon_ban: string | null;
    avisos_ban: number;
}

export interface UserResources {
    limite: number;
    money: number;
    level: number;
}

export type WalletResource = 'limite' | 'exp' | 'money' | 'banco';
export type RewardTimestampField =
    | 'lastclaim'
    | 'dailystreak'
    | 'lastcofre'
    | 'lastmiming'
    | 'lastwork'
    | 'crime'
    | 'lastrob'
    | 'lastslut'
    | 'timevot'
    | 'ryTime';

export interface UserWallet {
    id: string;
    nombre: string | null;
    limite: number;
    exp: number;
    money: number;
    banco: number;
    level: number;
    role: string;
    wait: number;
    lastclaim: number;
    dailystreak: number;
    lastcofre: number;
    lastmiming: number;
    lastwork: number;
    crime: number;
    lastrob: number;
    lastslut: number;
    timevot: number;
    ryTime: number;
}

export interface UserRecord {
    id: string;
    nombre: string | null;
    registered: boolean;
    num: string | null;
    lid: string | null;
    banned: boolean;
    razonBan: string | null;
    avisosBan: number;
    warnPv: boolean;
    warn: number;
    warnAntiporn: number;
    warnEstado: number;
    edad: number | null;
    gender: string | null;
    birthday: string | null;
    money: number;
    limite: number;
    exp: number;
    banco: number;
    level: number;
    role: string;
    roleDescription: string | null;
    regTime: Date | null;
    serialNumber: string | null;
    serial_number?: string | null;
    stickerPackname: string | null;
    stickerAuthor: string | null;
    ryTime: number;
    lastwork: number;
    lastmiming: number;
    lastclaim: number;
    dailystreak: number;
    lastcofre: number;
    lastrob: number;
    lastslut: number;
    timevot: number;
    wait: number;
    crime: number;
    marry: string | null;
    marryRequest: string | null;
}

export interface UserStickerSettings {
    sticker_packname: string | null;
    sticker_author: string | null;
}

export interface UserWarnInfo {
    id: string;
    warn: number;
}

export interface BannedUserInfo {
    id: string;
    razon_ban: string | null;
    avisos_ban: number;
}

export interface MarriedUserInfo {
    id: string;
    marry: string | null;
}

export interface UserNumberByLid {
    lid: string;
    num: string | null;
}

export interface UpsertUserInput {
    id: string;
    nombre: string;
    num: string | null;
    lid?: string;
}

export interface CompleteRegistrationInput {
    id: string;
    nombre: string;
    edad: number;
    gender: string;
    birthday: string | null;
    regTime: Date;
    serialNumber: string;
}

export interface UpsertRegisteredAdminInput {
    id: string;
    nombre: string | null;
    num: string | null;
    lid?: string | null;
    serialNumber: string;
}
