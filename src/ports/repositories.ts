import type {
    BannedUserInfo,
    CompleteRegistrationInput,
    MarriedUserInfo,
    RewardTimestampField,
    UpsertRegisteredAdminInput,
    UpsertUserInput,
    UserBanInfo,
    UserRecord,
    UserResources,
    UserStickerSettings,
    UserWallet,
    UserWarnInfo,
    WalletResource,
} from '../domain/users.js';
import type {GroupSettings} from '../types/config.js';
import type {
    ConfigurableFeatureKey,
    ContextGroupSettings,
    ExpiredGroup,
    GroupSettingsRecord,
    NsfwGroupSettings,
    FamilyAccessRule,
    CommandAccessRule,
    UserGroupRoleRecord,
} from '../domain/groups.js';
import type {CensoredUserRecord, UpsertCensoredUserInput} from '../domain/censored-users.js';
import type {SubbotBooleanFlag, SubbotConfig, SubbotTypeCounts} from '../domain/subbots.js';
import type {AudioResponseRecord, UpsertAudioResponseInput} from '../domain/audio-responses.js';
import type {
    CharacterClaimOwner,
    CharacterRecord,
    CharacterSaleInput,
    CompleteCharacterSaleInput,
    CreateCharacterInput,
} from '../domain/characters.js';
import type {
    ChatMemoryRecord,
    CreateMessageLogInput,
    ExpirableChatMemory,
    MarkMessageDeletedInput,
    MessageLogType,
} from '../domain/operations.js';
import type {RobExperienceInput, RobExperienceResult} from '../domain/robbery.js';

export type {
    BannedUserInfo,
    CompleteRegistrationInput,
    MarriedUserInfo,
    RewardTimestampField,
    UpsertRegisteredAdminInput,
    UpsertUserInput,
    UserBanInfo,
    UserNumberByLid,
    UserRecord,
    UserResources,
    UserStickerSettings,
    UserWallet,
    UserWarnInfo,
    WalletResource,
} from '../domain/users.js';
export type {
    ConfigurableFeatureKey,
    ContextGroupSettings,
    ExpiredGroup,
    GroupSettingsRecord,
    NsfwGroupSettings,
    UserGroupRoleRecord,
    FamilyAccessRule,
    CommandAccessRule,
} from '../domain/groups.js';
export type {CensoredUserRecord, UpsertCensoredUserInput} from '../domain/censored-users.js';
export type {SubbotBooleanFlag, SubbotConfig, SubbotTypeCounts} from '../domain/subbots.js';
export type {AudioConfig, AudioEntry, AudioResponseRecord, UpsertAudioResponseInput} from '../domain/audio-responses.js';
export type {
    CharacterClaimOwner,
    CharacterRecord,
    CharacterSaleInput,
    CompleteCharacterSaleInput,
    CreateCharacterInput,
} from '../domain/characters.js';
export type {
    AiMemoryMessage,
    ChatMemoryRecord,
    CreateMessageLogInput,
    ExpirableChatMemory,
    MarkMessageDeletedInput,
    MessageLogType,
} from '../domain/operations.js';

export interface UserRepository {
    findById(userId: string): Promise<UserRecord | null>;
    findNameById(userId: string): Promise<string | null>;
    findWallet(userId: string): Promise<UserWallet | null>;
    listWallets(): Promise<UserWallet[]>;
    findBanInfo(userId: string): Promise<UserBanInfo | null>;
    incrementBanNotice(userId: string, notices: number): Promise<void>;
    setBanStatus(userId: string, banned: boolean, reason: string | null): Promise<void>;
    getResources(userId: string): Promise<UserResources>;
    addWalletResource(userId: string, resource: WalletResource, amount: number): Promise<number | null>;
    addWalletResourceAndSetWait(userId: string, resource: WalletResource, amount: number, wait: number): Promise<number | null>;
    addWalletResourcesAndSetFields(input: {
        userId: string;
        resources: Partial<Record<WalletResource, number>>;
        fields: Partial<Record<RewardTimestampField, number>>;
    }): Promise<void>;
    exchangeWalletResources(input: {
        userId: string;
        from: WalletResource;
        to: WalletResource;
        fromAmount: number;
        toAmount: number;
    }): Promise<boolean>;
    transferWalletResource(input: {
        from: string;
        to: string;
        resource: WalletResource;
        amount: number;
    }): Promise<boolean>;
    robExperience(input: RobExperienceInput): Promise<RobExperienceResult>;
    setLevelRole(userId: string, level: number, role: string): Promise<void>;
    decrementLimit(userId: string, amount: number): Promise<void>;
    decrementMoney(userId: string, amount: number): Promise<void>;
    upsertBasicUser(input: UpsertUserInput): Promise<void>;
    clearLidFromOtherUsers(lid: string, userId: string): Promise<void>;
    setUserLid(userId: string, lid: string): Promise<void>;
    upsertRegisteredAdmin(input: UpsertRegisteredAdminInput): Promise<void>;
    completeRegistration(input: CompleteRegistrationInput): Promise<void>;
    unregister(userId: string): Promise<void>;
    setGender(userId: string, gender: string): Promise<boolean>;
    setBirthday(userId: string, birthday: string | null): Promise<boolean>;
    countUsers(): Promise<{total: number; registered: number}>;
    findStickerSettings(userId: string): Promise<UserStickerSettings | null>;
    setStickerSettings(userId: string, packname: string, author: string | null): Promise<void>;
    findWarnInfo(userId: string): Promise<UserWarnInfo | null>;
    incrementWarn(userId: string): Promise<void>;
    decrementWarn(userId: string): Promise<void>;
    resetWarn(userId: string): Promise<void>;
    listWarnedUsers(): Promise<UserWarnInfo[]>;
    findNumberByLid(lid: string): Promise<string | null>;
    listBannedUsers(): Promise<BannedUserInfo[]>;
    listMarriedUsers(): Promise<MarriedUserInfo[]>;
    getPrivateWarn(userId: string): Promise<boolean | null>;
    setPrivateWarn(userId: string, warned: boolean): Promise<void>;
    setMarriageRequest(userId: string, requesterId: string | null): Promise<void>;
    getMarriageRequest(userId: string): Promise<string | null>;
    marryUsers(userA: string, userB: string): Promise<void>;
    divorceUsers(userA: string, userB: string): Promise<void>;
}

export interface CommandResourceRepository {
    reserve(input: {
        id: string;
        userId: string;
        pluginId: string;
        messageId: string;
        limit: number;
        money: number;
        level: number;
        expiresAt: Date;
    }): Promise<import('../domain/command-resources.js').CommandResourceDecision>;
    commit(id: string): Promise<import('../domain/command-resources.js').CommandResourceReservation | null>;
    release(id: string, reason: string): Promise<import('../domain/command-resources.js').CommandResourceReservation | null>;
    releaseExpired(now: Date): Promise<number>;
}

export interface UserGroupRoleRepository {
    upsert(input: {
        groupId: string;
        userId: string;
        role: string;
        roleDescription: string | null;
        updatedBy: string | null;
    }): Promise<void>;
    insertDefaultIfMissing(input: {
        groupId: string;
        userId: string;
        role: string;
        roleDescription: string | null;
        updatedBy?: string | null;
    }): Promise<void>;
    find(groupId: string, userId: string): Promise<UserGroupRoleRecord | null>;
    listByGroup(groupId: string): Promise<UserGroupRoleRecord[]>;
}

export interface ChatRepository {
    upsertActiveChat(input: {
        chatId: string;
        isGroup: boolean;
        timestamp: number;
        botId: string;
    }): Promise<void>;
    insertIfMissing(chatId: string): Promise<void>;
    markBotLeftGroup(groupId: string, botId: string): Promise<void>;
    listJoinedGroupIdsByBot(botId: string): Promise<string[]>;
    countChats(): Promise<number>;
    countByBot(botId: string): Promise<{
        totalGroups: number;
        joinedGroups: number;
        privateChats: number;
    }>;
}

export interface MessageRepository {
    incrementUserGroupCount(userId: string, groupId: string): Promise<void>;
    deleteUserGroupCount(userId: string, groupId: string): Promise<void>;
    listGroupCounts(groupId: string): Promise<Array<{user_id: string; message_count: number}>>;
    listGroupActivity(groupId: string): Promise<Array<{user_id: string; message_count: number; last_message_at: Date | null}>>;
}

export interface MessageLogRepository {
    create(input: CreateMessageLogInput): Promise<void>;
    markDeleted(input: MarkMessageDeletedInput): Promise<void>;
}

export interface StatsRepository {
    incrementCommand(command: string): Promise<void>;
    sumCommands(): Promise<number>;
}

export interface GroupSettingsRepository {
    findByGroupId(groupId: string): Promise<GroupSettingsRecord | null>;
    findContextSettings(groupId: string): Promise<ContextGroupSettings | null>;
    findNsfwSettings(groupId: string): Promise<NsfwGroupSettings | null>;
    setBooleanFlag(groupId: string, flag: string, value: boolean): Promise<void>;
    setAutoAcceptMode(groupId: string, mode: GroupSettings['autoAcceptMode']): Promise<void>;
    setBotAccessMode(groupId: string, mode: GroupSettings['botAccessMode']): Promise<void>;
    setAutoresponderMode(groupId: string, enabled: boolean, mode: GroupSettings['autoresponderMode']): Promise<void>;
    setAutoresponderTrigger(groupId: string, trigger: GroupSettings['autoresponderTrigger']): Promise<void>;
    setNsfwMode(groupId: string, enabled: boolean, mode: GroupSettings['nsfwAccessMode']): Promise<void>;
    setNsfwGifMode(groupId: string, enabled: boolean, mode: GroupSettings['nsfwGifAccessMode']): Promise<void>;
    listFamilyAccessRules(groupId: string): Promise<Array<{target: ConfigurableFeatureKey; rule: FamilyAccessRule}>>;
    upsertFamilyAccessRule(groupId: string, feature: ConfigurableFeatureKey, rule: FamilyAccessRule): Promise<void>;
    listCommandAccessRules(groupId: string): Promise<Array<{target: string; rule: CommandAccessRule}>>;
    upsertCommandAccessRule(groupId: string, command: string, rule: CommandAccessRule): Promise<void>;
    setGreetingHidetagMode(groupId: string, type: 'welcome' | 'bye', mode: GroupSettings['welcomeHidetagMode']): Promise<void>;
    setTextMessage(input: {
        groupId: string;
        type: 'welcome' | 'bye' | 'promote' | 'demote';
        text: string;
        photoMode?: boolean;
        registeredBy?: string;
        groupPhoto?: boolean;
    }): Promise<void>;
    setNsfwSchedule(groupId: string, schedule: string): Promise<void>;
    setBanned(groupId: string, banned: boolean): Promise<void>;
    setPrimaryBot(groupId: string, botId: string | null): Promise<void>;
    setExpiration(groupId: string, expiresAt: number): Promise<void>;
    setAutorespondPrompt(groupId: string, prompt: string | null): Promise<void>;
    setMemoryTtl(groupId: string, seconds: number): Promise<void>;
    listBannedGroups(): Promise<string[]>;
    listExpiredGroups(now: number): Promise<ExpiredGroup[]>;
    clearExpiration(groupId: string): Promise<void>;
    clearPrimaryBot(groupId: string): Promise<void>;
}

export interface CensoredUserRepository {
    listByGroup(groupId: string): Promise<CensoredUserRecord[]>;
    upsert(input: UpsertCensoredUserInput): Promise<{created: boolean}>;
    delete(groupId: string, userId: string, userLid: string | null): Promise<boolean>;
}

export interface SubbotRepository {
    findConfig(botId: string): Promise<SubbotConfig | null>;
    listConfigs(tipo?: string | null): Promise<SubbotConfig[]>;
    countByType(): Promise<SubbotTypeCounts>;
    updateTipo(botId: string, tipo: string): Promise<void>;
    setBooleanFlag(botId: string, flag: SubbotBooleanFlag, value: boolean): Promise<void>;
    setName(botId: string, name: string): Promise<void>;
    setLogoUrl(botId: string, logoUrl: string): Promise<void>;
    setMode(botId: string, mode: string): Promise<void>;
    setPrefix(botId: string, prefix: string[]): Promise<void>;
    setOwners(botId: string, owners: string[]): Promise<void>;
}

export interface CharacterRepository {
    findByUrl(url: string): Promise<CharacterRecord | null>;
    findByName(name: string): Promise<CharacterRecord | null>;
    findOwnedByName(name: string, ownerId: string): Promise<CharacterRecord | null>;
    listByOwner(ownerId: string): Promise<CharacterRecord[]>;
    listClaimOwners(): Promise<CharacterClaimOwner[]>;
    create(input: CreateCharacterInput): Promise<CharacterRecord>;
    setOwner(characterId: number, ownerId: string): Promise<void>;
    setForSale(characterId: number, input: CharacterSaleInput): Promise<void>;
    withdrawFromSale(characterId: number, removedAt: number): Promise<void>;
    completeSale(characterId: number, input: CompleteCharacterSaleInput): Promise<void>;
    vote(characterId: number, votes: number, price: number): Promise<void>;
}

export interface ApiTokenRepository {
    findTokenB64(name: string): Promise<string | null>;
}

export interface AudioResponseRepository {
    listByScopes(scopes: string[]): Promise<AudioResponseRecord[]>;
    listAll(): Promise<AudioResponseRecord[]>;
    upsert(input: UpsertAudioResponseInput): Promise<void>;
    markDeleted(scope: string, phrase: string, regex?: string): Promise<void>;
}

export interface PendingReport {
    id: number;
    sender_id: string;
    sender_name?: string | null;
    mensaje: string;
    tipo: string;
    fecha?: Date | string;
}

export interface ReportRepository {
    create(input: {
        senderId: string;
        senderName: string | null;
        message: string;
        type: string;
    }): Promise<void>;
    listPending(limit: number): Promise<PendingReport[]>;
    deleteById(id: number): Promise<void>;
}

export interface ChatMemoryRepository {
    listExpirable(): Promise<ExpirableChatMemory[]>;
    findByChatId(chatId: string): Promise<ChatMemoryRecord | null>;
    upsert(chatId: string, history: unknown): Promise<void>;
    deleteByChatId(chatId: string): Promise<void>;
}

export interface DatabaseTableStat {
    tabla: string;
    filas: number;
    tamano: string;
}

export interface DatabaseInfo {
    usuarios: number;
    registrados: number;
    chats: number;
    grupos: number;
    mensajes: number;
    tablas: DatabaseTableStat[];
    totalSize: string | null;
}

export interface DatabaseRepository {
    getInfo(): Promise<DatabaseInfo>;
}

export interface AppRepositories {
    users: UserRepository;
    commandResources: CommandResourceRepository;
    userGroupRoles: UserGroupRoleRepository;
    chats: ChatRepository;
    messages: MessageRepository;
    messageLogs: MessageLogRepository;
    stats: StatsRepository;
    subbots: SubbotRepository;
    characters: CharacterRepository;
    apiTokens: ApiTokenRepository;
    audioResponses: AudioResponseRepository;
    groupSettings: GroupSettingsRepository;
    censoredUsers: CensoredUserRepository;
    reports: ReportRepository;
    chatMemory: ChatMemoryRepository;
    database: DatabaseRepository;
}
