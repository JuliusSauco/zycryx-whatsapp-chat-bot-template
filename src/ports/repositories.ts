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
export type RewardTimestampField = 'lastclaim' | 'dailystreak' | 'lastcofre' | 'lastmiming' | 'lastwork' | 'crime' | 'lastrob' | 'lastslut' | 'timevot' | 'ryTime';

export interface UserWallet {
    id: string;
    nombre: string | null;
    limite: number;
    exp: number;
    money: number;
    banco: number;
    level: number;
    role: string | null;
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
    registered: boolean | null;
    num: string | null;
    lid: string | null;
    banned: boolean | null;
    razonBan: string | null;
    avisosBan: number | null;
    warnPv: boolean | null;
    warn: number | null;
    warnAntiporn: number | null;
    warnEstado: number | null;
    edad: number | null;
    gender: string | null;
    birthday: string | null;
    money: number | null;
    limite: number | null;
    exp: number | null;
    banco: number | null;
    level: number | null;
    role: string | null;
    regTime: Date | null;
    serialNumber: string | null;
    serial_number?: string | null;
    stickerPackname: string | null;
    stickerAuthor: string | null;
    ryTime: number | null;
    lastwork: number | null;
    lastmiming: number | null;
    lastclaim: number | null;
    dailystreak: number | null;
    lastcofre: number | null;
    lastrob: number | null;
    lastslut: number | null;
    timevot: number | null;
    wait: number | null;
    crime: number | null;
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
    setLevelRole(userId: string, level: number, role: string): Promise<void>;
    decrementLimit(userId: string, amount: number): Promise<void>;
    decrementMoney(userId: string, amount: number): Promise<void>;
    upsertBasicUser(input: UpsertUserInput): Promise<void>;
    clearLidFromOtherUsers(lid: string, userId: string): Promise<void>;
    setUserLid(userId: string, lid: string): Promise<void>;
    completeRegistration(input: CompleteRegistrationInput): Promise<void>;
    unregister(userId: string): Promise<void>;
    setGender(userId: string, gender: string): Promise<void>;
    setBirthday(userId: string, birthday: string | null): Promise<void>;
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
}

export type MessageLogType = 'text' | 'multimedia';

export interface MessageLogRepository {
    create(input: {
        groupId: string;
        userId: string;
        messageId: string;
        messageText: string;
        messageType: MessageLogType;
        isReply: boolean;
        replyToMessageId: string | null;
    }): Promise<void>;
    markDeleted(input: {
        groupId: string;
        messageId: string;
        deletedBy: string | null;
        deletedByLid: string | null;
        deletedAt: Date;
    }): Promise<void>;
}

export interface StatsRepository {
    incrementCommand(command: string): Promise<void>;
    sumCommands(): Promise<number>;
}

export interface ExpiredGroup {
    group_id: string;
    expired: number;
}

export interface GroupSettingsRepository {
    findByGroupId(groupId: string): Promise<Partial<GroupSettings> | null>;
    findContextSettings(groupId: string): Promise<{
        banned: boolean;
        primary_bot: string | null;
        modoadmin: boolean;
        antifake: boolean;
        message_logging: boolean;
        antilink: boolean;
        antilink2: boolean;
        virusTotal: boolean;
        audios: boolean;
        autolevelup: boolean;
    } | null>;
    findNsfwSettings(groupId: string): Promise<{
        modohorny: boolean;
        nsfw_horario: string | null;
    } | null>;
    setBooleanFlag(groupId: string, flag: string, value: boolean): Promise<void>;
    setAutoAcceptMode(groupId: string, mode: GroupSettings['autoAcceptMode']): Promise<void>;
    setTextMessage(input: {
        groupId: string;
        type: 'welcome' | 'bye' | 'promote' | 'demote';
        text: string;
        photoMode?: boolean;
        registeredBy?: string;
        hidetag?: boolean;
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

export interface SubbotRepository {
    findConfig(botId: string): Promise<SubbotConfig | null>;
    listConfigs(tipo?: string | null): Promise<SubbotConfig[]>;
    countByType(): Promise<{total: number; oficiales: number; subbots: number}>;
    updateTipo(botId: string, tipo: string): Promise<void>;
    setBooleanFlag(botId: string, flag: string, value: boolean): Promise<void>;
    setName(botId: string, name: string): Promise<void>;
    setLogoUrl(botId: string, logoUrl: string): Promise<void>;
    setMode(botId: string, mode: string): Promise<void>;
    setPrefix(botId: string, prefix: string[]): Promise<void>;
    setOwners(botId: string, owners: string[]): Promise<void>;
}

export interface CharacterRecord {
    id: number;
    name: string;
    url: string;
    tipo: string | null;
    anime: string | null;
    rareza: string | null;
    price: number;
    previous_price: number | null;
    claimed_by: string | null;
    for_sale: boolean;
    seller: string | null;
    votes: number;
    last_removed_time: number | null;
}

export interface CharacterRepository {
    findByUrl(url: string): Promise<CharacterRecord | null>;
    findByName(name: string): Promise<CharacterRecord | null>;
    findOwnedByName(name: string, ownerId: string): Promise<CharacterRecord | null>;
    listByOwner(ownerId: string): Promise<CharacterRecord[]>;
    listClaimOwners(): Promise<Array<{claimed_by: string | null}>>;
    create(input: Omit<CharacterRecord, 'id'>): Promise<CharacterRecord>;
    setOwner(characterId: number, ownerId: string): Promise<void>;
    setForSale(characterId: number, input: {price: number; seller: string; previousPrice: number | null}): Promise<void>;
    withdrawFromSale(characterId: number, removedAt: number): Promise<void>;
    completeSale(characterId: number, input: {buyer: string; price?: number}): Promise<void>;
    vote(characterId: number, votes: number, price: number): Promise<void>;
}

export interface ApiTokenRepository {
    findTokenB64(name: string): Promise<string | null>;
}

export interface AudioResponseRecord {
    scope: string;
    phrase: string;
    regex: string;
    audioUrls: string[];
    deleted: boolean | null;
}

export interface AudioResponseRepository {
    listByScopes(scopes: string[]): Promise<AudioResponseRecord[]>;
    listAll(): Promise<AudioResponseRecord[]>;
    upsert(input: {
        scope: string;
        phrase: string;
        regex: string;
        audioUrls: string[];
    }): Promise<void>;
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

export interface ExpirableChatMemory {
    chat_id: string;
    updated_at: Date | string;
    memory_ttl: number;
}

export interface ChatMemoryRecord {
    history: unknown;
    updated_at: Date | string | null;
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
    vacuumFull(): Promise<void>;
}

export interface AppRepositories {
    users: UserRepository;
    chats: ChatRepository;
    messages: MessageRepository;
    messageLogs: MessageLogRepository;
    stats: StatsRepository;
    subbots: SubbotRepository;
    characters: CharacterRepository;
    apiTokens: ApiTokenRepository;
    audioResponses: AudioResponseRepository;
    groupSettings: GroupSettingsRepository;
    reports: ReportRepository;
    chatMemory: ChatMemoryRepository;
    database: DatabaseRepository;
}
import type {GroupSettings, SubbotConfig} from '../types/config.js';
