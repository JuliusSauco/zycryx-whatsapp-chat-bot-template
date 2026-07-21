import type {groupSettings, userGroupRoles} from '../../db/schema.js';
import type {ContextGroupSettings, GroupSettingsRecord, NsfwGroupSettings, UserGroupRoleRecord} from '../../domain/groups.js';
import type {AccessMode, AutoAcceptMode, AutoresponderTrigger, GreetingHidetagMode} from '../../types/config.js';

export type GroupSettingsRow = typeof groupSettings.$inferSelect;
export type UserGroupRoleRow = typeof userGroupRoles.$inferSelect;

export type ContextGroupSettingsRow = Pick<
    GroupSettingsRow,
    | 'banned'
    | 'primaryBot'
    | 'modoadmin'
    | 'botAccessMode'
    | 'antifake'
    | 'messageLogging'
    | 'antilink'
    | 'antilink2'
    | 'virusTotal'
    | 'autoresponder'
    | 'autoresponderMode'
    | 'autoresponderTrigger'
    | 'gamesAccessMode'
    | 'toolsAccessMode'
    | 'rpgAccessMode'
    | 'downloadsAccessMode'
    | 'searchAccessMode'
    | 'stickersAccessMode'
    | 'convertersAccessMode'
    | 'funAccessMode'
    | 'modohorny'
    | 'nsfwAccessMode'
    | 'audios'
    | 'autolevelup'
>;

export type NsfwGroupSettingsRow = Pick<GroupSettingsRow, 'modohorny' | 'nsfwAccessMode' | 'nsfwHorario'>;

export function normalizeGreetingHidetagMode(
    mode: string | null,
    legacyHidetag: boolean | null,
): GreetingHidetagMode {
    if (mode === 'admin' || mode === 'all' || mode === 'off') return mode;
    return legacyHidetag ? 'all' : 'off';
}

export function normalizeAccessMode(mode: string | null, fallback: AccessMode = 'all'): AccessMode {
    if (mode === 'all' || mode === 'admin' || mode === 'superadmin' || mode === 'owner') return mode;
    return fallback;
}

export function normalizeBotAccessMode(mode: string | null, legacyAdminMode: boolean | null): AccessMode {
    return normalizeAccessMode(mode, legacyAdminMode ? 'admin' : 'all');
}

export function normalizeAutoresponderTrigger(trigger: string | null): AutoresponderTrigger {
    return trigger === 'all' ? 'all' : 'mention';
}

export function normalizeAutoAcceptMode(mode: string | null): AutoAcceptMode {
    if (
        mode === 'on'
        || mode === 'on_hidetag_admin'
        || mode === 'on_hidetag_all'
        || mode === 'off_hidetag_admin'
        || mode === 'off_hidetag_all'
    ) return mode;
    return 'off';
}

export function mapGroupSettings(row: GroupSettingsRow): GroupSettingsRecord {
    return {
        group_id: row.groupId,
        welcomeConfigId: row.welcomeConfigId,
        welcome: row.welcome ?? true,
        detect: row.detect ?? true,
        antifake: row.antifake ?? false,
        antilink: row.antilink ?? false,
        antilink2: row.antilink2 ?? false,
        virusTotal: row.virusTotal ?? false,
        autoresponder: row.autoresponder ?? true,
        autoresponderMode: normalizeAccessMode(row.autoresponderMode),
        autoresponderTrigger: normalizeAutoresponderTrigger(row.autoresponderTrigger),
        gamesAccessMode: normalizeAccessMode(row.gamesAccessMode),
        toolsAccessMode: normalizeAccessMode(row.toolsAccessMode),
        rpgAccessMode: normalizeAccessMode(row.rpgAccessMode),
        downloadsAccessMode: normalizeAccessMode(row.downloadsAccessMode),
        searchAccessMode: normalizeAccessMode(row.searchAccessMode),
        stickersAccessMode: normalizeAccessMode(row.stickersAccessMode),
        convertersAccessMode: normalizeAccessMode(row.convertersAccessMode),
        funAccessMode: normalizeAccessMode(row.funAccessMode),
        modohorny: row.modohorny ?? false,
        nsfwAccessMode: row.nsfwAccessMode ? normalizeAccessMode(row.nsfwAccessMode) : 'owner',
        audios: row.audios ?? false,
        antiStatus: row.antiStatus ?? false,
        modoadmin: row.modoadmin ?? false,
        photowelcome: row.photowelcome ?? true,
        welcomeRegisteredBy: row.welcomeRegisteredBy,
        welcomeHidetag: row.welcomeHidetag ?? false,
        welcomeHidetagMode: normalizeGreetingHidetagMode(row.welcomeHidetagMode, row.welcomeHidetag),
        welcomeGroupPhoto: row.welcomeGroupPhoto ?? false,
        bye: row.bye ?? true,
        byeConfigId: row.byeConfigId,
        byeRegisteredBy: row.byeRegisteredBy,
        byeHidetag: row.byeHidetag ?? false,
        byeHidetagMode: normalizeGreetingHidetagMode(row.byeHidetagMode, row.byeHidetag),
        byeGroupPhoto: row.byeGroupPhoto ?? false,
        photobye: row.photobye ?? true,
        autolevelup: row.autolevelup ?? true,
        nsfw_horario: row.nsfwHorario,
        sWelcome: row.sWelcome,
        sBye: row.sBye,
        sPromote: row.sPromote,
        sDemote: row.sDemote,
        sAutorespond: row.sAutorespond,
        banned: row.banned ?? false,
        expired: row.expired ?? 0,
        memory_ttl: row.memoryTtl ?? 86400,
        primary_bot: row.primaryBot,
        autoAcceptMode: normalizeAutoAcceptMode(row.autoAcceptMode),
        botAccessMode: normalizeBotAccessMode(row.botAccessMode, row.modoadmin),
        messageLogging: row.messageLogging ?? false,
    };
}

export function mapContextGroupSettings(row: ContextGroupSettingsRow): ContextGroupSettings {
    return {
        banned: row.banned ?? false,
        primary_bot: row.primaryBot ?? null,
        modoadmin: row.modoadmin ?? false,
        botAccessMode: normalizeBotAccessMode(row.botAccessMode, row.modoadmin),
        antifake: row.antifake ?? false,
        message_logging: row.messageLogging ?? false,
        antilink: row.antilink ?? false,
        antilink2: row.antilink2 ?? false,
        virusTotal: row.virusTotal ?? false,
        autoresponder: row.autoresponder ?? true,
        autoresponderMode: normalizeAccessMode(row.autoresponderMode),
        autoresponderTrigger: normalizeAutoresponderTrigger(row.autoresponderTrigger),
        gamesAccessMode: normalizeAccessMode(row.gamesAccessMode),
        toolsAccessMode: normalizeAccessMode(row.toolsAccessMode),
        rpgAccessMode: normalizeAccessMode(row.rpgAccessMode),
        downloadsAccessMode: normalizeAccessMode(row.downloadsAccessMode),
        searchAccessMode: normalizeAccessMode(row.searchAccessMode),
        stickersAccessMode: normalizeAccessMode(row.stickersAccessMode),
        convertersAccessMode: normalizeAccessMode(row.convertersAccessMode),
        funAccessMode: normalizeAccessMode(row.funAccessMode),
        modohorny: row.modohorny ?? false,
        nsfwAccessMode: row.nsfwAccessMode ? normalizeAccessMode(row.nsfwAccessMode) : 'owner',
        audios: row.audios ?? false,
        autolevelup: row.autolevelup ?? true,
    };
}

export function mapNsfwGroupSettings(row: NsfwGroupSettingsRow): NsfwGroupSettings {
    return {
        modohorny: row.modohorny ?? false,
        nsfwAccessMode: row.nsfwAccessMode ? normalizeAccessMode(row.nsfwAccessMode) : 'owner',
        nsfw_horario: row.nsfwHorario ?? null,
    };
}

export function mapUserGroupRole(row: UserGroupRoleRow): UserGroupRoleRecord {
    return {
        group_id: row.groupId,
        user_id: row.userId,
        role: row.role,
        role_description: row.roleDescription ?? null,
    };
}
