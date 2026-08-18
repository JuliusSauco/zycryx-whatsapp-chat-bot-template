export interface UserBanInfo {
    banned: boolean;
    razon_ban: string | null;
    avisos_ban: number;
}

export interface UserResources {
    limite: number;
    coins: number;
    level: number;
}

export type WalletResource = 'limite' | 'exp' | 'coins' | 'botcoin' | 'zyxcoin';
export type TransferableWalletResource = 'limite' | 'exp' | 'coins';
export const PROFILE_GENDERS = ['Masculino', 'Femenino', 'No Binario', 'Otro'] as const;
export type ProfileGender = typeof PROFILE_GENDERS[number];
export interface WalletTransferHistoryItem {
    id: number;
    resource: TransferableWalletResource;
    amount: number;
    balanceAfter: number;
    counterpartyId: string | null;
    operationId: string | null;
    createdAt: Date;
}

export interface WalletTransferHistoryPage {
    items: WalletTransferHistoryItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
export type WalletTransactionReason =
    | 'opening_balance'
    | 'registration'
    | 'unregistration'
    | 'daily_reward'
    | 'chest_reward'
    | 'crime'
    | 'robbery'
    | 'game_reward'
    | 'game_bet'
    | 'transfer'
    | 'limit_purchase'
    | 'currency_exchange'
    | 'command_cost'
    | 'command_refund'
    | 'bank_transfer'
    | 'loan_disbursement'
    | 'loan_payment'
    | 'admin_adjustment'
    | 'character_market'
    | 'other';
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
    /** Identidades disponibles para renderizar y mencionar al usuario sin confundir LID con teléfono. */
    username?: string | null;
    num?: string | null;
    lid?: string | null;
    limite: number;
    exp: number;
    coins: number;
    botcoin: number;
    zyxcoin: number;
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
    username: string | null;
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
    gender: ProfileGender | null;
    nationality: string | null;
    birthday: string | null;
    coins: number;
    limite: number;
    exp: number;
    botcoin: number;
    zyxcoin: number;
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
    username?: string | null;
    num: string | null;
    lid?: string;
}

export interface CompleteRegistrationInput {
    id: string;
    nombre: string;
    edad: number;
    gender: ProfileGender;
    nationality: string | null;
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
