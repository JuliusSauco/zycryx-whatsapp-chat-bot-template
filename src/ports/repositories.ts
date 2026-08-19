import type {
    BannedUserInfo,
    CompleteRegistrationInput,
    MarriedUserInfo,
    ProfileGender,
    RewardTimestampField,
    UpsertRegisteredAdminInput,
    UpsertUserInput,
    UserBanInfo,
    UserRecord,
    UserResources,
    UserStickerSettings,
    UserWallet,
    UserWarnInfo,
    WalletTransactionReason,
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
    GroupBooleanFlag,
} from '../domain/groups.js';
import type {CensoredUserRecord, UpsertCensoredUserInput} from '../domain/censored-users.js';
import type {BotInstanceType, SubbotBooleanFlag, SubbotConfig, SubbotTypeCounts} from '../domain/subbots.js';
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
import type {BankBalances, BankExchangeRate, BankOverview, BankResource, BankTransferResult, CurrencyExchangeResult, ExchangeAmount, LoanPaymentResult, LoanRequestResult} from '../domain/bank.js';
import type {
    BuyRaffleTicketsResult, BuySecurityResult, DrawRaffleResult, EconomicResourceDefinition,
    RaffleTicketPage, SecurityOverview, TicketPaymentResource,
} from '../domain/store.js';

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
    WalletTransactionReason,
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
    addWalletResource(userId: string, resource: WalletResource, amount: number, reason: WalletTransactionReason, operation?: string): Promise<number | null>;
    addWalletResourceAndSetWait(userId: string, resource: WalletResource, amount: number, wait: number, reason: WalletTransactionReason, operation?: string): Promise<number | null>;
    addWalletResourcesAndSetFields(input: {
        userId: string;
        resources: Partial<Record<WalletResource, number>>;
        fields: Partial<Record<RewardTimestampField, number>>;
        reason: WalletTransactionReason;
        operation?: string;
    }): Promise<void>;
    exchangeWalletResources(input: {
        userId: string;
        from: WalletResource;
        to: WalletResource;
        fromAmount: number;
        toAmount: number;
        reason: WalletTransactionReason;
        operation?: string;
    }): Promise<boolean>;
    transferWalletResource(input: {
        from: string;
        to: string;
        resource: import('../domain/users.js').TransferableWalletResource;
        amount: number;
        reason: WalletTransactionReason;
        operation?: string;
        operationId: string;
    }): Promise<boolean>;
    listWalletTransferHistory(userId: string, page: number, pageSize: number): Promise<import('../domain/users.js').WalletTransferHistoryPage>;
    robExperience(input: RobExperienceInput): Promise<RobExperienceResult>;
    setLevelRole(userId: string, level: number, role: string): Promise<void>;
    decrementLimit(userId: string, amount: number): Promise<void>;
    decrementCoins(userId: string, amount: number): Promise<void>;
    upsertBasicUser(input: UpsertUserInput): Promise<void>;
    setUserLid(userId: string, lid: string): Promise<void>;
    upsertRegisteredAdmin(input: UpsertRegisteredAdminInput): Promise<void>;
    completeRegistration(input: CompleteRegistrationInput): Promise<void>;
    unregister(userId: string): Promise<void>;
    setProfileName(userId: string, name: string): Promise<boolean>;
    setGender(userId: string, gender: ProfileGender): Promise<boolean>;
    setNationality(userId: string, nationality: string | null): Promise<boolean>;
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
          coins: number;
          alternativeCoins: number;
          level: number;
        expiresAt: Date;
    }): Promise<import('../domain/command-resources.js').CommandResourceDecision>;
    commit(id: string): Promise<import('../domain/command-resources.js').CommandResourceReservation | null>;
    release(id: string, reason: string): Promise<import('../domain/command-resources.js').CommandResourceReservation | null>;
    releaseExpired(now: Date): Promise<number>;
}

export interface BankRepository {
    ensureAccount(userId: string): Promise<void>;
    getOverview(userId: string, now: Date): Promise<BankOverview>;
    transferCustody(input: {
        userId: string;
        resource: BankResource;
        direction: 'deposit' | 'withdraw';
        amount: number | 'all';
        operationId: string;
    }): Promise<BankTransferResult>;
    transferBetweenAccounts(input: {
        from: string;
        to: string;
        resource: BankResource;
        amount: number;
        operationId: string;
    }): Promise<import('../domain/bank.js').BankAccountTransferResult>;
    listTransferHistory(userId: string, page: number, pageSize: number): Promise<import('../domain/bank.js').BankTransferHistoryPage>;
    getReserves(): Promise<BankBalances>;
    adjustReserve(input: {
        actorId: string;
        resource: BankResource;
        amount: number;
        operationId: string;
    }): Promise<number | null>;
    listExchangeRates(): Promise<BankExchangeRate[]>;
    exchangeCurrency(input: {
        userId: string;
        sourceResource: WalletResource;
        targetResource: BankResource;
        amount: ExchangeAmount;
        operationId: string;
    }): Promise<CurrencyExchangeResult>;
    requestLoan(input: {userId: string; amount: number; now: Date; operationId: string}): Promise<LoanRequestResult>;
    payLoan(input: {userId: string; amount: number | 'all'; now: Date; operationId: string}): Promise<LoanPaymentResult>;
    refreshLoanStatuses(now: Date): Promise<number>;
}

export interface StoreRepository {
    listEconomicResources(): Promise<EconomicResourceDefinition[]>;
    getSecurityOverview(userId: string): Promise<SecurityOverview>;
    buySecurity(userId: string, now: Date, operationId: string): Promise<BuySecurityResult>;
    deactivateSecurity(userId: string, now: Date): Promise<boolean>;
    renewDueSecuritySubscriptions(now: Date, limit: number): Promise<{paid: number; deactivated: number}>;
    buyRaffleTickets(input: {
        userId: string;
        quantity: number;
        paymentResource?: TicketPaymentResource;
        codes: string[];
        operationId: string;
    }): Promise<BuyRaffleTicketsResult>;
    listAvailableRaffleTickets(page: number, pageSize: number): Promise<RaffleTicketPage>;
    drawRaffle(input: {title: string; ownerId: string}): Promise<DrawRaffleResult>;
}

export interface DailyReminderRepository {
    claimForBot(botId: string, activityDay: string): Promise<string[]>;
    markSent(groupId: string, activityDay: string, messageId: string | null): Promise<void>;
    markFailed(groupId: string, activityDay: string, error: string): Promise<void>;
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
    setBooleanFlag(groupId: string, flag: GroupBooleanFlag, value: boolean): Promise<void>;
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
    setGreetingConfig(groupId: string, type: 'welcome' | 'bye', enabled: boolean, mode: GroupSettings['welcomeHidetagMode']): Promise<void>;
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
    findInstanceIdByJid(botJid: string): Promise<string | null>;
    findBotJidByInstanceId(botId: string): Promise<string | null>;
    listConfigs(instanceType?: BotInstanceType | null): Promise<SubbotConfig[]>;
    countByType(): Promise<SubbotTypeCounts>;
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
    vote(characterId: number, actorId: string, price: number): Promise<void>;
}

export interface ApiTokenRepository {
    findToken(name: string): Promise<string | null>;
    upsertToken(name: string, token: string): Promise<void>;
}

export type UserIdentityRepository = Pick<UserRepository,
    'findById' | 'findNameById' | 'upsertBasicUser' | 'setUserLid' | 'findNumberByLid'>;
export type UserRegistrationRepository = Pick<UserRepository,
    'upsertRegisteredAdmin' | 'completeRegistration' | 'unregister' | 'setProfileName' | 'setGender' |
    'setNationality' | 'setBirthday' | 'countUsers'>;
export type UserModerationRepository = Pick<UserRepository,
    'findBanInfo' | 'incrementBanNotice' | 'setBanStatus' | 'findWarnInfo' | 'incrementWarn' |
    'decrementWarn' | 'resetWarn' | 'listWarnedUsers' | 'listBannedUsers' | 'getPrivateWarn' | 'setPrivateWarn'>;
export type UserRelationshipRepository = Pick<UserRepository,
    'listMarriedUsers' | 'setMarriageRequest' | 'getMarriageRequest' | 'marryUsers' | 'divorceUsers'>;
export type UserEconomyRepository = Pick<UserRepository,
    'findWallet' | 'listWallets' | 'getResources' | 'addWalletResource' | 'addWalletResourceAndSetWait' |
    'addWalletResourcesAndSetFields' | 'exchangeWalletResources' | 'transferWalletResource' |
    'listWalletTransferHistory' | 'robExperience' | 'setLevelRole' | 'decrementLimit' | 'decrementCoins'>;
export type UserPreferencesRepository = Pick<UserRepository,
    'findStickerSettings' | 'setStickerSettings'>;

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
    attempt_count?: number;
}

export interface ReportRepository {
    create(input: {
        senderId: string;
        senderName: string | null;
        message: string;
        type: string;
    }): Promise<void>;
    claimPending(limit: number, workerId: string, leaseSeconds: number): Promise<PendingReport[]>;
    markDelivered(id: number, workerId: string, deliveredMessageId: string | null): Promise<void>;
    markFailed(id: number, workerId: string, error: string): Promise<void>;
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

export interface SyncedDataResetResult {
    users: number;
    groupSettings: number;
    chats: number;
    chatMemories: number;
}

export interface DatabaseRepository {
    getInfo(): Promise<DatabaseInfo>;
    resetSyncedData(): Promise<SyncedDataResetResult>;
}

export interface AppRepositories {
    userIdentity: UserIdentityRepository;
    userRegistration: UserRegistrationRepository;
    userModeration: UserModerationRepository;
    userRelationships: UserRelationshipRepository;
    userEconomy: UserEconomyRepository;
    userPreferences: UserPreferencesRepository;
    banks: BankRepository;
    store: StoreRepository;
    dailyReminders: DailyReminderRepository;
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
