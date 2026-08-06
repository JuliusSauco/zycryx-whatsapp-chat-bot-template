import {sql} from 'drizzle-orm';
import {bigint, boolean, check, date, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uniqueIndex} from 'drizzle-orm/pg-core';

export const usuarios = pgTable('usuarios', {
    id: text('id').primaryKey(),
    nombre: text('nombre'),
    username: text('username'),
    registered: boolean('registered').default(false),
    num: text('num'),
    lid: text('lid').unique(),
    banned: boolean('banned').default(false),
    razonBan: text('razon_ban'),
    avisosBan: integer('avisos_ban').default(0),
    warnPv: boolean('warn_pv').default(false),
    warn: integer('warn').default(0),
    warnAntiporn: integer('warn_antiporn').default(0),
    warnEstado: integer('warn_estado').default(0),
    edad: integer('edad'),
    gender: text('gender'),
    birthday: date('birthday'),
    level: integer('level').default(0),
    role: text('role').notNull().default('novato'),
    roleDescription: text('role_description'),
    regTime: timestamp('reg_time'),
    serialNumber: text('serial_number'),
    stickerPackname: text('sticker_packname'),
    stickerAuthor: text('sticker_author'),
    ryTime: bigint('ry_time', {mode: 'number'}).default(0),
    lastwork: bigint('lastwork', {mode: 'number'}).default(0),
    lastmiming: bigint('lastmiming', {mode: 'number'}).default(0),
    lastclaim: bigint('lastclaim', {mode: 'number'}).default(0),
    dailystreak: bigint('dailystreak', {mode: 'number'}).default(0),
    lastcofre: bigint('lastcofre', {mode: 'number'}).default(0),
    lastrob: bigint('lastrob', {mode: 'number'}).default(0),
    robDailyCount: integer('rob_daily_count').notNull().default(0),
    robDay: date('rob_day'),
    lastslut: bigint('lastslut', {mode: 'number'}).default(0),
    timevot: bigint('timevot', {mode: 'number'}).default(0),
    wait: bigint('wait', {mode: 'number'}).default(0),
    crime: bigint('crime', {mode: 'number'}).default(0),
    marry: text('marry'),
    marryRequest: text('marry_request'),
});

export const userWallets = pgTable('user_wallets', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    limite: integer('limite').notNull().default(10),
    exp: integer('exp').notNull().default(0),
    coins: integer('coins').notNull().default(100),
    botcoin: integer('botcoin').notNull().default(0),
    zyxcoin: integer('zyxcoin').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => ({
    limiteNonNegative: check('user_wallets_limite_non_negative', sql`${table.limite} >= 0`),
    expNonNegative: check('user_wallets_exp_non_negative', sql`${table.exp} >= 0`),
    coinsNonNegative: check('user_wallets_coins_non_negative', sql`${table.coins} >= 0`),
    botcoinNonNegative: check('user_wallets_botcoin_non_negative', sql`${table.botcoin} >= 0`),
    zyxcoinNonNegative: check('user_wallets_zyxcoin_non_negative', sql`${table.zyxcoin} >= 0`),
}));

export const walletTransactions = pgTable('wallet_transactions', {
    id: bigint('id', {mode: 'number'}).primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    resource: text('resource').notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    reason: text('reason').notNull(),
    operation: text('operation'),
    operationId: text('operation_id'),
    counterpartyId: text('counterparty_id').references(() => usuarios.id, {onDelete: 'set null'}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
    userCreatedAtIdx: index('wallet_transactions_user_created_at_idx').on(table.userId, table.createdAt),
    operationIdx: index('wallet_transactions_operation_idx').on(table.operationId),
    resourceCheck: check('wallet_transactions_resource_check', sql`${table.resource} in ('limite', 'exp', 'coins', 'botcoin', 'zyxcoin')`),
    balanceNonNegative: check('wallet_transactions_balance_non_negative', sql`${table.balanceAfter} >= 0`),
}));

export const userBankAccounts = pgTable('user_bank_accounts', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    limite: integer('limite').notNull().default(0),
    coins: integer('coins').notNull().default(0),
    botcoin: integer('botcoin').notNull().default(0),
    zyxcoin: integer('zyxcoin').notNull().default(0),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => ({
    limiteNonNegative: check('user_bank_accounts_limite_non_negative', sql`${table.limite} >= 0`),
    coinsNonNegative: check('user_bank_accounts_coins_non_negative', sql`${table.coins} >= 0`),
    botcoinNonNegative: check('user_bank_accounts_botcoin_non_negative', sql`${table.botcoin} >= 0`),
    zyxcoinNonNegative: check('user_bank_accounts_zyxcoin_non_negative', sql`${table.zyxcoin} >= 0`),
    statusCheck: check('user_bank_accounts_status_check', sql`${table.status} in ('active', 'frozen', 'closed')`),
}));

export const bankReserves = pgTable('bank_reserves', {
    resource: text('resource').primaryKey(),
    balance: bigint('balance', {mode: 'number'}).notNull().default(0),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => ({
    resourceCheck: check('bank_reserves_resource_check', sql`${table.resource} in ('limite', 'coins', 'botcoin', 'zyxcoin')`),
    balanceNonNegative: check('bank_reserves_balance_non_negative', sql`${table.balance} >= 0`),
}));

export const bankExchangeRates = pgTable('bank_exchange_rates', {
    sourceResource: text('source_resource').notNull(),
    targetResource: text('target_resource').notNull(),
    sourceAmount: integer('source_amount').notNull(),
    targetAmount: integer('target_amount').notNull().default(1),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.sourceResource, table.targetResource]}),
    sourceCheck: check('bank_exchange_rates_source_check', sql`${table.sourceResource} in ('limite', 'exp', 'coins', 'botcoin', 'zyxcoin')`),
    targetCheck: check('bank_exchange_rates_target_check', sql`${table.targetResource} in ('limite', 'coins', 'botcoin', 'zyxcoin')`),
    amountCheck: check('bank_exchange_rates_amount_check', sql`${table.sourceAmount} > 0 and ${table.targetAmount} > 0`),
    pairCheck: check('bank_exchange_rates_pair_check', sql`${table.sourceResource} <> ${table.targetResource}`),
}));

export const bankLoans = pgTable('bank_loans', {
    id: bigint('id', {mode: 'number'}).primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    principal: integer('principal').notNull(),
    interestAmount: integer('interest_amount').notNull(),
    principalOutstanding: integer('principal_outstanding').notNull(),
    interestOutstanding: integer('interest_outstanding').notNull(),
    status: text('status').notNull().default('active'),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
    dueAt: timestamp('due_at').notNull(),
    defaultAt: timestamp('default_at').notNull(),
    paidAt: timestamp('paid_at'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => ({
    userStatusIdx: index('bank_loans_user_status_idx').on(table.userId, table.status),
    dueStatusIdx: index('bank_loans_due_status_idx').on(table.status, table.dueAt),
    oneOutstandingLoan: uniqueIndex('bank_loans_one_outstanding_per_user').on(table.userId)
        .where(sql`${table.status} in ('active', 'overdue', 'defaulted')`),
    statusCheck: check('bank_loans_status_check', sql`${table.status} in ('active', 'overdue', 'defaulted', 'paid')`),
    amountsCheck: check('bank_loans_amounts_check', sql`${table.principal} > 0 and ${table.interestAmount} >= 0 and ${table.principalOutstanding} between 0 and ${table.principal} and ${table.interestOutstanding} between 0 and ${table.interestAmount}`),
    paidCheck: check('bank_loans_paid_check', sql`${table.status} <> 'paid' or (${table.principalOutstanding} = 0 and ${table.interestOutstanding} = 0)`),
}));

export const bankTransactions = pgTable('bank_transactions', {
    id: bigint('id', {mode: 'number'}).primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id').references(() => usuarios.id, {onDelete: 'set null'}),
    actorId: text('actor_id').references(() => usuarios.id, {onDelete: 'set null'}),
    resource: text('resource').notNull(),
    type: text('type').notNull(),
    amount: bigint('amount', {mode: 'number'}).notNull(),
    balanceAfter: bigint('balance_after', {mode: 'number'}).notNull(),
    operationId: text('operation_id').notNull(),
    loanId: bigint('loan_id', {mode: 'number'}).references(() => bankLoans.id, {onDelete: 'set null'}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
    userCreatedAtIdx: index('bank_transactions_user_created_at_idx').on(table.userId, table.createdAt),
    operationIdx: index('bank_transactions_operation_idx').on(table.operationId),
    resourceCheck: check('bank_transactions_resource_check', sql`${table.resource} in ('limite', 'coins', 'botcoin', 'zyxcoin')`),
    balanceNonNegative: check('bank_transactions_balance_non_negative', sql`${table.balanceAfter} >= 0`),
}));

export const bankLoanPayments = pgTable('bank_loan_payments', {
    id: bigint('id', {mode: 'number'}).primaryKey().generatedAlwaysAsIdentity(),
    loanId: bigint('loan_id', {mode: 'number'}).notNull().references(() => bankLoans.id, {onDelete: 'cascade'}),
    amount: integer('amount').notNull(),
    principalPaid: integer('principal_paid').notNull(),
    interestPaid: integer('interest_paid').notNull(),
    walletTransactionId: bigint('wallet_transaction_id', {mode: 'number'}).notNull().references(() => walletTransactions.id),
    bankTransactionId: bigint('bank_transaction_id', {mode: 'number'}).notNull().references(() => bankTransactions.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
    loanCreatedAtIdx: index('bank_loan_payments_loan_created_at_idx').on(table.loanId, table.createdAt),
    amountCheck: check('bank_loan_payments_amount_check', sql`${table.amount} > 0 and ${table.principalPaid} >= 0 and ${table.interestPaid} >= 0 and ${table.amount} = ${table.principalPaid} + ${table.interestPaid}`),
}));

export const commandResourceReservations = pgTable('command_resource_reservations', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    pluginId: text('plugin_id').notNull(),
    messageId: text('message_id').notNull(),
    limitAmount: integer('limit_amount').notNull().default(0),
    coinsAmount: integer('coins_amount').notNull().default(0),
    alternativeCoinsAmount: integer('alternative_coins_amount').notNull().default(0),
    paymentResource: text('payment_resource').notNull().default('none'),
    requiredLevel: integer('required_level').notNull().default(0),
    status: text('status').notNull().default('pending'),
    releaseReason: text('release_reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
}, table => ({
    pendingExpiryIdx: index('command_resource_reservations_pending_expiry_idx').on(table.status, table.expiresAt),
    userIdx: index('command_resource_reservations_user_idx').on(table.userId),
    alternativeCoinsNonNegative: check('command_resource_reservations_alternative_coins_non_negative', sql`${table.alternativeCoinsAmount} >= 0`),
    paymentResourceCheck: check('command_resource_reservations_payment_resource_check', sql`${table.paymentResource} in ('limite', 'coins', 'mixed', 'none')`),
}));

export const groupSettings = pgTable('group_settings', {
    groupId: text('group_id').primaryKey(),
    welcomeConfigId: serial('welcome_config_id'),
    welcome: boolean('welcome').default(true),
    detect: boolean('detect').default(true),
    antifake: boolean('antifake').default(false),
    antilink: boolean('antilink').default(false),
    antilink2: boolean('antilink2').default(false),
    virusTotal: boolean('virustotal').default(false),
    autoresponder: boolean('autoresponder').default(true),
    autoresponderMode: text('autoresponder_mode').default('all'),
    autoresponderTrigger: text('autoresponder_trigger').default('mention'),
    gamesAccessMode: text('games_access_mode').default('all'),
    toolsAccessMode: text('tools_access_mode').default('all'),
    rpgAccessMode: text('rpg_access_mode').default('all'),
    downloadsAccessMode: text('downloads_access_mode').default('all'),
    searchAccessMode: text('search_access_mode').default('all'),
    stickersAccessMode: text('stickers_access_mode').default('all'),
    convertersAccessMode: text('converters_access_mode').default('all'),
    funAccessMode: text('fun_access_mode').default('all'),
    modohorny: boolean('modohorny').default(false),
    nsfwAccessMode: text('nsfw_access_mode').default('owner'),
    nsfwGifEnabled: boolean('nsfw_gif_enabled').default(false),
    nsfwGifAccessMode: text('nsfw_gif_access_mode').default('owner'),
    audios: boolean('audios').default(false),
    antiStatus: boolean('antistatus').default(false),
    modoadmin: boolean('modoadmin').default(false),
    photowelcome: boolean('photowelcome').default(true),
    welcomeRegisteredBy: text('welcome_registered_by'),
    welcomeHidetag: boolean('welcome_hidetag').default(false),
    welcomeHidetagMode: text('welcome_hidetag_mode').default('off'),
    welcomeGroupPhoto: boolean('welcome_group_photo').default(false),
    bye: boolean('bye').default(true),
    byeConfigId: serial('bye_config_id'),
    byeRegisteredBy: text('bye_registered_by'),
    byeHidetag: boolean('bye_hidetag').default(false),
    byeHidetagMode: text('bye_hidetag_mode').default('off'),
    byeGroupPhoto: boolean('bye_group_photo').default(false),
    photobye: boolean('photobye').default(true),
    autolevelup: boolean('autolevelup').default(true),
    antiporn: boolean('antiporn').default(false),
    nsfwHorario: text('nsfw_horario'),
    sWelcome: text('swelcome'),
    sBye: text('sbye'),
    sPromote: text('spromote'),
    sDemote: text('sdemote'),
    sAutorespond: text('sautorespond'),
    banned: boolean('banned').default(false),
    expired: bigint('expired', {mode: 'number'}).default(0),
    memoryTtl: integer('memory_ttl').default(86400),
    primaryBot: text('primary_bot'),
    autoAcceptMode: text('autoaccept_mode').default('off'),
    botAccessMode: text('bot_access_mode').default('all'),
    messageLogging: boolean('message_logging').default(false),
});

export const groupCommandAccessRules = pgTable('group_command_access_rules', {
    groupId: text('group_id').notNull(),
    scope: text('scope').notNull(),
    target: text('target').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    accessMode: text('access_mode').notNull().default('all'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.scope, table.target]}),
    groupScopeIdx: index('group_command_access_rules_group_scope_idx').on(table.groupId, table.scope),
    scopeCheck: check('group_command_access_rules_scope_check', sql`${table.scope} in ('family', 'command')`),
    accessModeCheck: check('group_command_access_rules_access_mode_check', sql`${table.accessMode} in ('all', 'admin', 'superadmin', 'owner')`),
}));

export const groupCensoredUsers = pgTable('group_censored_users', {
    groupId: text('group_id').notNull(),
    userId: text('user_id').notNull(),
    userLid: text('user_lid'),
    censoredBy: text('censored_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.userId]}),
    groupLidIdx: index('group_censored_users_group_lid_idx').on(table.groupId, table.userLid),
}));

export const chats = pgTable('chats', {
    id: text('id').primaryKey(),
    isGroup: boolean('is_group').default(true),
    timestamp: bigint('timestamp', {mode: 'number'}),
    isActive: boolean('is_active').default(true),
    botId: text('bot_id'),
    joined: boolean('joined').default(true),
});

export const messages = pgTable('messages', {
    userId: text('user_id').notNull(),
    groupId: text('group_id').notNull(),
    messageCount: integer('message_count').default(0),
    lastMessageAt: timestamp('last_message_at').defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.userId, table.groupId]}),
}));

export const userGroupRoles = pgTable('user_group_roles', {
    groupId: text('group_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').notNull(),
    roleDescription: text('role_description'),
    updatedBy: text('updated_by'),
    updatedAt: timestamp('updated_at').defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.userId]}),
    groupIdx: index('user_group_roles_group_idx').on(table.groupId),
    userIdx: index('user_group_roles_user_idx').on(table.userId),
}));

export const messageLogs = pgTable('message_logs', {
    id: serial('id').primaryKey(),
    groupId: text('group_id').notNull(),
    userId: text('user_id').notNull(),
    messageId: text('message_id').notNull(),
    messageText: text('message_text').notNull(),
    messageType: text('message_type').notNull(),
    isReply: boolean('is_reply').default(false),
    replyToMessageId: text('reply_to_message_id'),
    isDeleted: boolean('is_deleted').default(false),
    deletedAt: timestamp('deleted_at'),
    deletedBy: text('deleted_by'),
    deletedByLid: text('deleted_by_lid'),
    createdAt: timestamp('created_at').defaultNow(),
}, table => ({
    groupCreatedAtIdx: index('message_logs_group_created_at_idx').on(table.groupId, table.createdAt),
    groupMessageIdIdx: index('message_logs_group_message_id_idx').on(table.groupId, table.messageId),
    userIdx: index('message_logs_user_idx').on(table.userId),
}));

export const subbots = pgTable('subbots', {
    id: text('id').primaryKey(),
    tipo: text('tipo').default('null'),
    name: text('name'),
    logoUrl: text('logo_url'),
    prefix: text('prefix').array().default(sql`ARRAY['/', '.', '#']::text[]`),
    mode: text('mode').default('public'),
    owners: text('owners').array(),
    antiPrivate: boolean('anti_private').default(false),
    antiCall: boolean('anti_call').default(true),
    privacy: boolean('privacy').default(false),
    prestar: boolean('prestar').default(false),
});

export const characters = pgTable('characters', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    tipo: text('tipo'),
    anime: text('anime'),
    rareza: text('rareza'),
    price: integer('price').notNull(),
    previousPrice: integer('previous_price'),
    claimedBy: text('claimed_by'),
    forSale: boolean('for_sale').default(false),
    seller: text('seller'),
    votes: integer('votes').default(0),
    lastRemovedTime: bigint('last_removed_time', {mode: 'number'}),
});

export const reportes = pgTable('reportes', {
    id: serial('id').primaryKey(),
    senderId: text('sender_id').notNull(),
    senderName: text('sender_name'),
    mensaje: text('mensaje').notNull(),
    fecha: timestamp('fecha').defaultNow(),
    enviado: boolean('enviado').default(false),
    tipo: text('tipo').default('reporte'),
});

export const chatMemory = pgTable('chat_memory', {
    chatId: text('chat_id').primaryKey(),
    history: jsonb('history'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const stats = pgTable('stats', {
    command: text('command').primaryKey(),
    count: integer('count').default(1),
});

export const apiTokens = pgTable('api_tokens', {
    name: text('name').primaryKey(),
    tokenB64: text('token_b64').notNull(),
});

export const audioResponses = pgTable('audio_responses', {
    scope: text('scope').notNull(),
    phrase: text('phrase').notNull(),
    regex: text('regex').notNull(),
    audioUrls: text('audio_urls').array().notNull().default(sql`ARRAY[]::text[]`),
    deleted: boolean('deleted').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.scope, table.phrase]}),
}));
