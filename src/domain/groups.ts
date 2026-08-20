import type {AccessMode, AutoresponderTrigger, GroupSettings} from '../types/config.js';

export type GroupBooleanFlag =
    | 'welcome' | 'bye'
    | 'detect' | 'antifake' | 'antilink' | 'antilink2' | 'virusTotal' | 'antiporn'
    | 'autoresponder' | 'autolevelup' | 'audios' | 'modohorny'
    | 'messageLogging' | 'modoadmin' | 'welcomeHidetag' | 'byeHidetag';

export type GroupSettingsRecord = GroupSettings;

export interface ContextGroupSettings {
    banned: boolean;
    primary_bot: string | null;
    modoadmin: boolean;
    botAccessMode: AccessMode;
    antifake: boolean;
    message_logging: boolean;
    antilink: boolean;
    antilink2: boolean;
    virusTotal: boolean;
    autoresponder: boolean;
    autoresponderMode: AccessMode;
    autoresponderTrigger: AutoresponderTrigger;
    gamesAccessMode: AccessMode;
    toolsAccessMode: AccessMode;
    rpgAccessMode: AccessMode;
    downloadsAccessMode: AccessMode;
    searchAccessMode: AccessMode;
    stickersAccessMode: AccessMode;
    convertersAccessMode: AccessMode;
    funAccessMode: AccessMode;
    modohorny: boolean;
    nsfwAccessMode: AccessMode;
    nsfwGifEnabled: boolean;
    nsfwGifAccessMode: AccessMode;
    nsfw_horario: string | null;
    audios: boolean;
    autolevelup: boolean;
    familyAccess: FamilyAccessMap;
    commandAccess: CommandAccessMap;
}

export interface NsfwGroupSettings {
    modohorny: boolean;
    nsfwAccessMode: AccessMode;
    nsfwGifEnabled: boolean;
    nsfwGifAccessMode: AccessMode;
    nsfw_horario: string | null;
}

export interface ExpiredGroup {
    group_id: string;
    expired: number;
}

export interface UserGroupRoleRecord {
    group_id: string;
    user_id: string;
    role: string;
    role_description: string | null;
}

export type ConfigurableFeatureKey =
    | 'games'
    | 'tools'
    | 'rpg'
    | 'roleplay'
    | 'store'
    | 'downloads'
    | 'search'
    | 'stickers'
    | 'converters'
    | 'fun'
    | 'audio'
    | 'gifs'
    | 'nsfw'
    | 'nsfw-gifs';

export interface FamilyAccessRule {
    enabled: boolean;
    accessMode: AccessMode;
}

export type FamilyAccessMap = Record<ConfigurableFeatureKey, FamilyAccessRule>;
export type CommandAccessRule = FamilyAccessRule;
export type CommandAccessMap = Record<string, CommandAccessRule>;
