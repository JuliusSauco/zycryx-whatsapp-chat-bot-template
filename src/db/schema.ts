import {sql} from 'drizzle-orm';
import {bigint, boolean, check, customType, date, index, integer, pgSchema, primaryKey, text, timestamp, uniqueIndex, uuid} from 'drizzle-orm/pg-core';

export const botIdentitySchema = pgSchema('bot_identity');
export const botEconomySchema = pgSchema('bot_economy');
export const botGroupsSchema = pgSchema('bot_groups');
export const botRuntimeSchema = pgSchema('bot_runtime');
export const botContentSchema = pgSchema('bot_content');
export const botAiSchema = pgSchema('bot_ai');
export const botAuditSchema = pgSchema('bot_audit');
export const botSecuritySchema = pgSchema('bot_security');
export const botSessionsSchema = pgSchema('bot_sessions');

const timestampRange = customType<{data: string; driverData: string}>({
    dataType: () => 'tstzrange',
});

const encryptedBytes = customType<{data: Buffer; driverData: Buffer}>({
    dataType: () => 'bytea',
});

/** Raíz canónica de identidad y ciclo de vida para bot principal y subbots. */
export const botInstances = botRuntimeSchema.table('bot_instances', {
    id: text('id').primaryKey(),
    instanceType: text('instance_type').notNull().default('subbot'),
    botJid: text('bot_jid'),
    status: text('status').notNull().default('active'),
    name: text('name'),
    logoUrl: text('logo_url'),
    mode: text('mode').notNull().default('public'),
    antiPrivate: boolean('anti_private').notNull().default(false),
    antiCall: boolean('anti_call').notNull().default(true),
    privacy: boolean('privacy').notNull().default(false),
    prestar: boolean('prestar').notNull().default(false),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
    lastConnectedAt: timestamp('last_connected_at', {withTimezone: true}),
}, table => ({
    modeCheck: check('bot_instances_mode_check', sql`${table.mode} in ('public', 'private')`),
    typeCheck: check('bot_instances_type_check', sql`${table.instanceType} in ('main', 'subbot')`),
    statusCheck: check('bot_instances_status_check', sql`${table.status} in ('active', 'revoked', 'error')`),
    typeStatusIdx: index('bot_instances_type_status_idx').on(table.instanceType, table.status),
    botJidUnique: uniqueIndex('bot_instances_bot_jid_uidx').on(table.botJid),
}));

export const encryptionKeyVersions = botSecuritySchema.table('encryption_key_versions', {
    version: integer('version').primaryKey(),
    algorithm: text('algorithm').notNull().default('aes-256-gcm'),
    kdf: text('kdf').notNull().default('raw-key'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    retiredAt: timestamp('retired_at', {withTimezone: true}),
}, table => ({
    versionPositive: check('encryption_key_versions_version_positive', sql`${table.version} > 0`),
    algorithmCheck: check('encryption_key_versions_algorithm_check', sql`${table.algorithm} = 'aes-256-gcm'`),
    kdfCheck: check('encryption_key_versions_kdf_check', sql`${table.kdf} in ('raw-key', 'argon2id')`),
    retirementCheck: check('encryption_key_versions_retirement_check', sql`${table.active} = (${table.retiredAt} IS NULL)`),
}));

export const encryptedSecrets = botSecuritySchema.table('encrypted_secrets', {
    name: text('name').notNull(),
    purpose: text('purpose').notNull().default('api-token'),
    keyVersion: integer('key_version').notNull().references(() => encryptionKeyVersions.version),
    ciphertext: encryptedBytes('ciphertext').notNull(),
    iv: encryptedBytes('iv').notNull(),
    authTag: encryptedBytes('auth_tag').notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({name: 'encrypted_secrets_pkey', columns: [table.purpose, table.name]}),
    purposeCheck: check('encrypted_secrets_purpose_check', sql`${table.purpose} in ('api-token', 'oauth-token', 'webhook-secret')`),
}));

export const baileysAuthSessions = botSessionsSchema.table('auth_sessions', {
    sessionId: text('session_id').primaryKey(),
    botInstanceId: text('bot_instance_id').notNull()
        .references(() => botInstances.id, {onDelete: 'cascade'}),
    /** Compatibilidad temporal; la migración de owners queda fuera de esta etapa. */
    ownerId: text('owner_id'),
    leaseOwner: text('lease_owner'),
    leaseExpiresAt: timestamp('lease_expires_at', {withTimezone: true}),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    leaseIdx: index('auth_sessions_lease_idx').on(table.leaseExpiresAt),
    botInstanceUnique: uniqueIndex('auth_sessions_bot_instance_uidx').on(table.botInstanceId),
}));

export const baileysAuthCredentials = botSessionsSchema.table('auth_credentials', {
    sessionId: text('session_id').primaryKey().references(() => baileysAuthSessions.sessionId, {onDelete: 'cascade'}),
    keyVersion: integer('key_version').notNull().references(() => encryptionKeyVersions.version),
    ciphertext: encryptedBytes('ciphertext').notNull(),
    iv: encryptedBytes('iv').notNull(),
    authTag: encryptedBytes('auth_tag').notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const baileysSignalKeys = botSessionsSchema.table('signal_keys', {
    sessionId: text('session_id').notNull().references(() => baileysAuthSessions.sessionId, {onDelete: 'cascade'}),
    keyType: text('key_type').notNull(),
    keyId: text('key_id').notNull(),
    keyVersion: integer('key_version').notNull().references(() => encryptionKeyVersions.version),
    ciphertext: encryptedBytes('ciphertext').notNull(),
    iv: encryptedBytes('iv').notNull(),
    authTag: encryptedBytes('auth_tag').notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.sessionId, table.keyType, table.keyId]}),
    sessionTypeIdx: index('signal_keys_session_type_idx').on(table.sessionId, table.keyType),
}));

export const usuarios = botIdentitySchema.table('users', {
    id: text('id').primaryKey(),
    nombre: text('nombre'),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const userIdentities = botIdentitySchema.table('user_identities', {
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    identityType: text('identity_type').notNull(),
    identityValue: text('identity_value').notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.userId, table.identityType]}),
    typeValueUnique: uniqueIndex('user_identities_type_value_uidx').on(table.identityType, table.identityValue),
    typeCheck: check('user_identities_type_check', sql`${table.identityType} in ('phone', 'lid', 'username')`),
}));

export const userProfiles = botIdentitySchema.table('user_profiles', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    gender: text('gender'),
    nationality: text('nationality'),
    birthday: date('birthday'),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    genderCheck: check('user_profiles_gender_check', sql`${table.gender} IS NULL OR ${table.gender} in ('hombre', 'mujer', 'otro')`),
    nationalityCheck: check('user_profiles_nationality_check', sql`${table.nationality} IS NULL OR char_length(btrim(${table.nationality})) BETWEEN 2 AND 64`),
    birthdayCheck: check('user_profiles_birthday_check', sql`${table.birthday} IS NULL OR (${table.birthday} <= current_date AND ${table.birthday} >= DATE '1900-01-01')`),
}));

export const userRegistrations = botIdentitySchema.table('user_registrations', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    serialNumber: text('serial_number').notNull().unique(),
    registeredAt: timestamp('registered_at', {withTimezone: true}).notNull().defaultNow(),
});

export const userBans = botIdentitySchema.table('user_bans', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    reason: text('reason'),
    noticeCount: integer('notice_count').notNull().default(0),
    bannedAt: timestamp('banned_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    noticeNonNegative: check('user_bans_notice_non_negative', sql`${table.noticeCount} >= 0`),
}));

export const userWarnings = botIdentitySchema.table('user_warnings', {
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    warningType: text('warning_type').notNull(),
    count: integer('count').notNull().default(0),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.userId, table.warningType]}),
    countNonNegative: check('user_warnings_count_non_negative', sql`${table.count} >= 0`),
    typeCheck: check('user_warnings_type_check', sql`${table.warningType} in ('general', 'antiporn', 'status')`),
}));

export const userPrivateChatStates = botIdentitySchema.table('user_private_chat_states', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    warned: boolean('warned').notNull().default(false),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const userProgress = botIdentitySchema.table('user_progress', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    level: integer('level').notNull().default(0),
    role: text('role').notNull().default('novato'),
    roleDescription: text('role_description'),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    levelNonNegative: check('user_progress_level_non_negative', sql`${table.level} >= 0`),
}));

export const userStickerPreferences = botIdentitySchema.table('user_sticker_preferences', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    packname: text('packname').notNull(),
    author: text('author'),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const userCooldowns = botIdentitySchema.table('user_cooldowns', {
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    action: text('action').notNull(),
    lastUsedAt: timestamp('last_used_at', {withTimezone: true}).notNull(),
}, table => ({
    pk: primaryKey({columns: [table.userId, table.action]}),
    actionIdx: index('user_cooldowns_action_idx').on(table.action, table.lastUsedAt),
}));

export const userDailyRewards = botIdentitySchema.table('user_daily_rewards', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    streak: integer('streak').notNull().default(0),
}, table => ({
    streakNonNegative: check('user_daily_rewards_streak_non_negative', sql`${table.streak} >= 0`),
}));

export const userRobberyStates = botIdentitySchema.table('user_robbery_states', {
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
    activityDay: date('activity_day'),
    dailyCount: integer('daily_count').notNull().default(0),
}, table => ({
    countNonNegative: check('user_robbery_states_count_non_negative', sql`${table.dailyCount} >= 0`),
}));

export const marriages = botIdentitySchema.table('marriages', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const marriageMembers = botIdentitySchema.table('marriage_members', {
    marriageId: uuid('marriage_id').notNull().references(() => marriages.id, {onDelete: 'cascade'}),
    userId: text('user_id').primaryKey().references(() => usuarios.id, {onDelete: 'cascade'}),
}, table => ({
    marriageIdx: index('marriage_members_marriage_idx').on(table.marriageId),
}));

export const marriageRequests = botIdentitySchema.table('marriage_requests', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    requesterId: text('requester_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    recipientId: text('recipient_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', {withTimezone: true}),
    validDuring: timestampRange('valid_during').generatedAlwaysAs(
        sql`tstzrange("created_at", COALESCE("resolved_at", 'infinity'::timestamptz), '[)')`,
    ),
}, table => ({
    statusCheck: check('marriage_requests_status_check', sql`${table.status} in ('pending', 'accepted', 'rejected', 'cancelled')`),
    differentUsers: check('marriage_requests_different_users', sql`${table.requesterId} <> ${table.recipientId}`),
    recipientStatusIdx: index('marriage_requests_recipient_status_idx').on(table.recipientId, table.status),
}));

export const economyResources = botEconomySchema.table('resources', {
    code: text('code').primaryKey(),
    category: text('category').notNull(),
    displayName: text('display_name').notNull(),
    pluralName: text('plural_name').notNull(),
    emoji: text('emoji').notNull(),
    valueInExp: bigint('value_in_exp', {mode: 'number'}).notNull(),
    robberyEnabled: boolean('robbery_enabled').notNull().default(false),
    securityEligible: boolean('security_eligible').notNull().default(false),
    defaultWalletBalance: bigint('default_wallet_balance', {mode: 'number'}).notNull().default(0),
    walletEnabled: boolean('wallet_enabled').notNull().default(true),
    bankEnabled: boolean('bank_enabled').notNull().default(false),
    transferable: boolean('transferable').notNull().default(false),
}, table => ({
    categoryCheck: check('resources_category_check', sql`${table.category} in ('currency', 'experience', 'quota')`),
    defaultNonNegative: check('resources_default_non_negative', sql`${table.defaultWalletBalance} >= 0`),
    valuePositive: check('resources_value_in_exp_positive', sql`${table.valueInExp} > 0`),
}));

export const financialAccounts = botEconomySchema.table('financial_accounts', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: text('user_id').references(() => usuarios.id, {onDelete: 'cascade'}),
    accountType: text('account_type').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    userTypeUnique: uniqueIndex('financial_accounts_user_type_uidx').on(table.userId, table.accountType),
    oneReserve: uniqueIndex('financial_accounts_one_reserve_uidx').on(table.accountType)
        .where(sql`${table.userId} IS NULL AND ${table.accountType} = 'reserve'`),
    accountTypeCheck: check('financial_accounts_type_check', sql`${table.accountType} in ('wallet', 'bank', 'reserve')`),
    statusCheck: check('financial_accounts_status_check', sql`${table.status} in ('active', 'frozen', 'closed')`),
    ownerCheck: check('financial_accounts_owner_check', sql`(${table.accountType} = 'reserve' AND ${table.userId} IS NULL) OR (${table.accountType} <> 'reserve' AND ${table.userId} IS NOT NULL)`),
}));

export const accountBalances = botEconomySchema.table('account_balances', {
    accountId: uuid('account_id').notNull().references(() => financialAccounts.id, {onDelete: 'cascade'}),
    resourceCode: text('resource_code').notNull().references(() => economyResources.code, {onDelete: 'restrict'}),
    balance: bigint('balance', {mode: 'number'}).notNull().default(0),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.accountId, table.resourceCode]}),
    balanceNonNegative: check('account_balances_non_negative', sql`${table.balance} >= 0`),
}));

export const financialOperations = botEconomySchema.table('financial_operations', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    externalId: text('external_id').unique(),
    reason: text('reason').notNull(),
    operation: text('operation'),
    actorId: text('actor_id').references(() => usuarios.id, {onDelete: 'set null'}),
    counterpartyId: text('counterparty_id').references(() => usuarios.id, {onDelete: 'set null'}),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const ledgerEntries = botEconomySchema.table('ledger_entries', {
    id: bigint('id', {mode: 'number'}).primaryKey().generatedAlwaysAsIdentity(),
    operationId: uuid('operation_id').notNull().references(() => financialOperations.id, {onDelete: 'cascade'}),
    accountId: uuid('account_id').notNull().references(() => financialAccounts.id, {onDelete: 'restrict'}),
    resourceCode: text('resource_code').notNull().references(() => economyResources.code, {onDelete: 'restrict'}),
    amount: bigint('amount', {mode: 'number'}).notNull(),
    balanceAfter: bigint('balance_after', {mode: 'number'}).notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    accountCreatedIdx: index('ledger_entries_account_created_idx').on(table.accountId, table.createdAt),
    operationIdx: index('ledger_entries_operation_idx').on(table.operationId),
    balanceNonNegative: check('ledger_entries_balance_non_negative', sql`${table.balanceAfter} >= 0`),
    amountNonZero: check('ledger_entries_amount_non_zero', sql`${table.amount} <> 0`),
}));

export const bankExchangeRates = botEconomySchema.table('bank_exchange_rates', {
    sourceResource: text('source_resource').notNull().references(() => economyResources.code, {onDelete: 'cascade'}),
    targetResource: text('target_resource').notNull().references(() => economyResources.code, {onDelete: 'cascade'}),
    sourceAmount: integer('source_amount').notNull(),
    targetAmount: integer('target_amount').notNull().default(1),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.sourceResource, table.targetResource]}),
    amountCheck: check('bank_exchange_rates_amount_check', sql`${table.sourceAmount} > 0 and ${table.targetAmount} > 0`),
    pairCheck: check('bank_exchange_rates_pair_check', sql`${table.sourceResource} <> ${table.targetResource}`),
}));

export const bankLoans = botEconomySchema.table('bank_loans', {
    id: bigint('id', {mode: 'number'}).primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    principal: integer('principal').notNull(),
    interestAmount: integer('interest_amount').notNull(),
    principalOutstanding: integer('principal_outstanding').notNull(),
    interestOutstanding: integer('interest_outstanding').notNull(),
    status: text('status').notNull().default('active'),
    issuedAt: timestamp('issued_at', {withTimezone: true}).notNull().defaultNow(),
    dueAt: timestamp('due_at', {withTimezone: true}).notNull(),
    defaultAt: timestamp('default_at', {withTimezone: true}).notNull(),
    paidAt: timestamp('paid_at', {withTimezone: true}),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    userStatusIdx: index('bank_loans_user_status_idx').on(table.userId, table.status),
    dueStatusIdx: index('bank_loans_due_status_idx').on(table.status, table.dueAt),
    oneOutstandingLoan: uniqueIndex('bank_loans_one_outstanding_per_user').on(table.userId)
        .where(sql`${table.status} in ('active', 'overdue', 'defaulted')`),
    statusCheck: check('bank_loans_status_check', sql`${table.status} in ('active', 'overdue', 'defaulted', 'paid')`),
    amountsCheck: check('bank_loans_amounts_check', sql`${table.principal} > 0 and ${table.interestAmount} >= 0 and ${table.principalOutstanding} between 0 and ${table.principal} and ${table.interestOutstanding} between 0 and ${table.interestAmount}`),
    paidCheck: check('bank_loans_paid_check', sql`${table.status} <> 'paid' or (${table.principalOutstanding} = 0 and ${table.interestOutstanding} = 0)`),
}));

export const bankLoanPayments = botEconomySchema.table('bank_loan_payments', {
    id: bigint('id', {mode: 'number'}).primaryKey().generatedAlwaysAsIdentity(),
    loanId: bigint('loan_id', {mode: 'number'}).notNull().references(() => bankLoans.id, {onDelete: 'cascade'}),
    amount: integer('amount').notNull(),
    principalPaid: integer('principal_paid').notNull(),
    interestPaid: integer('interest_paid').notNull(),
    walletLedgerEntryId: bigint('wallet_ledger_entry_id', {mode: 'number'}).notNull().references(() => ledgerEntries.id),
    reserveLedgerEntryId: bigint('reserve_ledger_entry_id', {mode: 'number'}).notNull().references(() => ledgerEntries.id),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    loanCreatedAtIdx: index('bank_loan_payments_loan_created_at_idx').on(table.loanId, table.createdAt),
    amountCheck: check('bank_loan_payments_amount_check', sql`${table.amount} > 0 and ${table.principalPaid} >= 0 and ${table.interestPaid} >= 0 and ${table.amount} = ${table.principalPaid} + ${table.interestPaid}`),
}));

export const commandResourceReservations = botEconomySchema.table('command_resource_reservations', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    pluginId: text('plugin_id').notNull(),
    messageId: text('message_id').notNull(),
    paymentResource: text('payment_resource').notNull().default('none'),
    requiredLevel: integer('required_level').notNull().default(0),
    status: text('status').notNull().default('pending'),
    releaseReason: text('release_reason'),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', {withTimezone: true}).notNull(),
}, table => ({
    pendingExpiryIdx: index('command_resource_reservations_pending_expiry_idx').on(table.status, table.expiresAt),
    userIdx: index('command_resource_reservations_user_idx').on(table.userId),
    paymentResourceCheck: check('command_resource_reservations_payment_resource_check', sql`${table.paymentResource} in ('limite', 'coins', 'mixed', 'none')`),
    statusCheck: check('command_resource_reservations_status_check', sql`${table.status} in ('pending', 'committed', 'released')`),
    levelNonNegative: check('command_resource_reservations_level_non_negative', sql`${table.requiredLevel} >= 0`),
    releaseStateCheck: check('command_resource_reservations_release_state_check', sql`(${table.status} = 'released' AND ${table.releaseReason} IS NOT NULL) OR (${table.status} <> 'released' AND ${table.releaseReason} IS NULL)`),
}));

export const commandReservationItems = botEconomySchema.table('command_reservation_items', {
    reservationId: text('reservation_id').notNull().references(() => commandResourceReservations.id, {onDelete: 'cascade'}),
    resourceCode: text('resource_code').notNull().references(() => economyResources.code, {onDelete: 'restrict'}),
    itemType: text('item_type').notNull().default('charged'),
    amount: bigint('amount', {mode: 'number'}).notNull(),
}, table => ({
    pk: primaryKey({columns: [table.reservationId, table.resourceCode, table.itemType]}),
    amountPositive: check('command_reservation_items_amount_positive', sql`${table.amount} > 0`),
    itemTypeCheck: check('command_reservation_items_type_check', sql`${table.itemType} in ('charged', 'alternative')`),
}));

export const storeProducts = botEconomySchema.table('store_products', {
    code: text('code').primaryKey(),
    category: text('category').notNull(),
    name: text('name').notNull(),
    emoji: text('emoji').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    categoryCheck: check('store_products_category_check', sql`${table.category} in ('upgrade', 'ticket', 'item', 'character')`),
}));

export const userProductSubscriptions = botEconomySchema.table('user_product_subscriptions', {
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    productCode: text('product_code').notNull().references(() => storeProducts.code, {onDelete: 'restrict'}),
    tier: integer('tier').notNull(),
    status: text('status').notNull().default('active'),
    dailyPriceCoins: integer('daily_price_coins').notNull(),
    paidUntil: timestamp('paid_until', {withTimezone: true}).notNull(),
    nextChargeAt: timestamp('next_charge_at', {withTimezone: true}).notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.userId, table.productCode]}),
    dueIdx: index('user_product_subscriptions_due_idx').on(table.status, table.nextChargeAt),
    tierCheck: check('user_product_subscriptions_tier_check', sql`${table.tier} between 1 and 100`),
    priceCheck: check('user_product_subscriptions_price_check', sql`${table.dailyPriceCoins} > 0`),
    statusCheck: check('user_product_subscriptions_status_check', sql`${table.status} in ('active', 'inactive')`),
}));

export const subscriptionChargeEvents = botEconomySchema.table('subscription_charge_events', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    productCode: text('product_code').notNull().references(() => storeProducts.code, {onDelete: 'restrict'}),
    scheduledFor: timestamp('scheduled_for', {withTimezone: true}).notNull(),
    amountCoins: integer('amount_coins').notNull(),
    status: text('status').notNull(),
    financialOperationId: uuid('financial_operation_id').references(() => financialOperations.id, {onDelete: 'set null'}),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    uniqueCharge: uniqueIndex('subscription_charge_events_schedule_uidx').on(table.userId, table.productCode, table.scheduledFor),
    statusCheck: check('subscription_charge_events_status_check', sql`${table.status} in ('paid', 'insufficient_funds')`),
    amountCheck: check('subscription_charge_events_amount_check', sql`${table.amountCoins} > 0`),
}));

export const raffles = botEconomySchema.table('raffles', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    title: text('title').notNull(),
    status: text('status').notNull().default('completed'),
    startedBy: text('started_by').references(() => usuarios.id, {onDelete: 'set null'}),
    startedAt: timestamp('started_at', {withTimezone: true}).notNull().defaultNow(),
    drawnAt: timestamp('drawn_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    statusCheck: check('raffles_status_check', sql`${table.status} in ('completed', 'cancelled')`),
}));

export const raffleTickets = botEconomySchema.table('raffle_tickets', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    code: text('code').notNull().unique(),
    buyerId: text('buyer_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    status: text('status').notNull().default('available'),
    paymentResource: text('payment_resource').notNull(),
    unitPrice: integer('unit_price').notNull(),
    purchaseOperationId: uuid('purchase_operation_id').notNull().references(() => financialOperations.id, {onDelete: 'restrict'}),
    purchasedAt: timestamp('purchased_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    statusIdx: index('raffle_tickets_status_purchased_idx').on(table.status, table.purchasedAt),
    buyerIdx: index('raffle_tickets_buyer_idx').on(table.buyerId),
    statusCheck: check('raffle_tickets_status_check', sql`${table.status} in ('available', 'winner', 'loser')`),
    paymentCheck: check('raffle_tickets_payment_check', sql`${table.paymentResource} in ('coins', 'limite')`),
    priceCheck: check('raffle_tickets_price_check', sql`${table.unitPrice} > 0`),
}));

export const raffleEntries = botEconomySchema.table('raffle_entries', {
    raffleId: uuid('raffle_id').notNull().references(() => raffles.id, {onDelete: 'cascade'}),
    ticketId: uuid('ticket_id').notNull().references(() => raffleTickets.id, {onDelete: 'restrict'}),
    position: integer('position').notNull(),
    selected: boolean('selected').notNull().default(false),
}, table => ({
    pk: primaryKey({columns: [table.raffleId, table.ticketId]}),
    rafflePositionUnique: uniqueIndex('raffle_entries_position_uidx').on(table.raffleId, table.position),
    oneWinner: uniqueIndex('raffle_entries_one_winner_uidx').on(table.raffleId).where(sql`${table.selected} = true`),
    positionPositive: check('raffle_entries_position_positive', sql`${table.position} > 0`),
}));

export const groupSettings = botGroupsSchema.table('group_settings', {
    groupId: text('group_id').primaryKey(),
    banned: boolean('banned').notNull().default(false),
    expiresAt: timestamp('expires_at', {withTimezone: true}),
    primaryBot: text('primary_bot').references(() => botInstances.id, {onDelete: 'set null'}),
    autoAcceptMode: text('autoaccept_mode').notNull().default('off'),
    botAccessMode: text('bot_access_mode').notNull().default('all'),
    messageLogging: boolean('message_logging').notNull().default(false),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    autoAcceptModeCheck: check('group_settings_autoaccept_mode_check', sql`${table.autoAcceptMode} in ('off', 'on', 'on_hidetag_admin', 'on_hidetag_all', 'off_hidetag_admin', 'off_hidetag_all')`),
    botAccessModeCheck: check('group_settings_bot_access_mode_check', sql`${table.botAccessMode} in ('all', 'admin', 'superadmin', 'owner')`),
    primaryBotIdx: index('group_settings_primary_bot_idx').on(table.primaryBot),
}));

export const groupModerationSettings = botGroupsSchema.table('group_moderation_settings', {
    groupId: text('group_id').primaryKey().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    detect: boolean('detect').notNull().default(true),
    antifake: boolean('antifake').notNull().default(false),
    antilink: boolean('antilink').notNull().default(false),
    antilink2: boolean('antilink2').notNull().default(false),
    virusTotal: boolean('virustotal').notNull().default(false),
    antiStatus: boolean('antistatus').notNull().default(false),
    antiporn: boolean('antiporn').notNull().default(false),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const groupGreetings = botGroupsSchema.table('group_greetings', {
    groupId: text('group_id').notNull().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    eventType: text('event_type').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    messageTemplate: text('message_template'),
    photoEnabled: boolean('photo_enabled').notNull().default(true),
    hidetagMode: text('hidetag_mode').notNull().default('off'),
    useGroupPhoto: boolean('use_group_photo').notNull().default(false),
    registeredBy: text('registered_by').references(() => usuarios.id, {onDelete: 'set null'}),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.eventType]}),
    eventTypeCheck: check('group_greetings_event_type_check', sql`${table.eventType} in ('welcome', 'bye', 'promote', 'demote')`),
    hidetagModeCheck: check('group_greetings_hidetag_mode_check', sql`${table.hidetagMode} in ('off', 'admin', 'all')`),
}));

export const groupAutoresponderSettings = botGroupsSchema.table('group_autoresponder_settings', {
    groupId: text('group_id').primaryKey().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    enabled: boolean('enabled').notNull().default(true),
    accessMode: text('access_mode').notNull().default('all'),
    trigger: text('trigger').notNull().default('mention'),
    prompt: text('prompt'),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    accessModeCheck: check('group_autoresponder_access_mode_check', sql`${table.accessMode} in ('all', 'admin', 'superadmin', 'owner')`),
    triggerCheck: check('group_autoresponder_trigger_check', sql`${table.trigger} in ('mention', 'all')`),
}));

export const groupNsfwSettings = botGroupsSchema.table('group_nsfw_settings', {
    groupId: text('group_id').primaryKey().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    schedule: text('schedule'),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const groupMemorySettings = botGroupsSchema.table('group_memory_settings', {
    groupId: text('group_id').primaryKey().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    ttlSeconds: integer('ttl_seconds').notNull().default(86400),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    ttlNonNegative: check('group_memory_settings_ttl_non_negative', sql`${table.ttlSeconds} >= 0`),
}));

export const groupRpgSettings = botGroupsSchema.table('group_rpg_settings', {
    groupId: text('group_id').primaryKey().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    autoLevelUp: boolean('auto_level_up').notNull().default(true),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const groupCommandAccessRules = botGroupsSchema.table('group_command_access_rules', {
    groupId: text('group_id').notNull().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    scope: text('scope').notNull(),
    target: text('target').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    accessMode: text('access_mode').notNull().default('all'),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.scope, table.target]}),
    groupScopeIdx: index('group_command_access_rules_group_scope_idx').on(table.groupId, table.scope),
    scopeCheck: check('group_command_access_rules_scope_check', sql`${table.scope} in ('family', 'command')`),
    accessModeCheck: check('group_command_access_rules_access_mode_check', sql`${table.accessMode} in ('all', 'admin', 'superadmin', 'owner')`),
}));

export const groupDailyReminderSettings = botGroupsSchema.table('group_daily_reminder_settings', {
    groupId: text('group_id').primaryKey().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    enabled: boolean('enabled').notNull().default(true),
    localTime: text('local_time').notNull().default('08:00'),
    timezone: text('timezone').notNull().default('America/Bogota'),
    updatedBy: text('updated_by').references(() => usuarios.id, {onDelete: 'set null'}),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    localTimeCheck: check('group_daily_reminder_settings_time_check', sql`${table.localTime} ~ '^[0-2][0-9]:[0-5][0-9]$'`),
}));

export const groupDailyReminderDeliveries = botGroupsSchema.table('group_daily_reminder_deliveries', {
    groupId: text('group_id').notNull().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    activityDay: date('activity_day').notNull(),
    botId: text('bot_id').notNull().references(() => botInstances.id, {onDelete: 'cascade'}),
    status: text('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(1),
    messageId: text('message_id'),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', {withTimezone: true}),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.activityDay]}),
    dayStatusIdx: index('group_daily_reminder_deliveries_day_status_idx').on(table.activityDay, table.status),
    botDayIdx: index('group_daily_reminder_deliveries_bot_day_idx').on(table.botId, table.activityDay),
    statusCheck: check('group_daily_reminder_deliveries_status_check', sql`${table.status} in ('pending', 'sent', 'failed')`),
    attemptCheck: check('group_daily_reminder_deliveries_attempt_check', sql`${table.attemptCount} > 0`),
}));

export const groupCensoredUsers = botGroupsSchema.table('group_censored_users', {
    groupId: text('group_id').notNull().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    censoredBy: text('censored_by').notNull().references(() => usuarios.id, {onDelete: 'restrict'}),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.userId]}),
}));

export const chats = botGroupsSchema.table('chats', {
    id: text('id').primaryKey(),
    isGroup: boolean('is_group').notNull().default(true),
    lastActivityAt: timestamp('last_activity_at', {withTimezone: true}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

export const messages = botGroupsSchema.table('user_group_activity_counters', {
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    groupId: text('group_id').notNull().references(() => chats.id, {onDelete: 'cascade'}),
    messageCount: integer('message_count').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.userId, table.groupId]}),
    countNonNegative: check('user_group_activity_count_non_negative', sql`${table.messageCount} >= 0`),
}));

export const userGroupRoles = botGroupsSchema.table('user_group_roles', {
    groupId: text('group_id').notNull().references(() => groupSettings.groupId, {onDelete: 'cascade'}),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    role: text('role').notNull(),
    roleDescription: text('role_description'),
    updatedBy: text('updated_by').references(() => usuarios.id, {onDelete: 'set null'}),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.groupId, table.userId]}),
    groupIdx: index('user_group_roles_group_idx').on(table.groupId),
    userIdx: index('user_group_roles_user_idx').on(table.userId),
}));

export const messageLogs = botAuditSchema.table('message_logs', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    groupId: text('group_id').notNull(),
    userId: text('user_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    messageId: text('message_id').notNull(),
    messageText: text('message_text').notNull(),
    messageType: text('message_type').notNull(),
    isReply: boolean('is_reply').notNull().default(false),
    replyToMessageId: text('reply_to_message_id'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at', {withTimezone: true}),
    deletedBy: text('deleted_by').references(() => usuarios.id, {onDelete: 'set null'}),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    groupCreatedAtIdx: index('message_logs_group_created_at_idx').on(table.groupId, table.createdAt),
    groupMessageIdIdx: index('message_logs_group_message_id_idx').on(table.groupId, table.messageId),
    groupMessageUnique: uniqueIndex('message_logs_group_message_uidx').on(table.groupId, table.messageId),
    userIdx: index('message_logs_user_idx').on(table.userId),
}));

/** @deprecated Nombre de dominio histórico; la tabla canónica es bot_instances. */
export const subbots = botInstances;

export const subbotPrefixes = botRuntimeSchema.table('subbot_prefixes', {
    botId: text('bot_id').notNull().references(() => subbots.id, {onDelete: 'cascade'}),
    prefix: text('prefix').notNull(),
    position: integer('position').notNull(),
}, table => ({
    pk: primaryKey({columns: [table.botId, table.prefix]}),
    botPositionUnique: uniqueIndex('subbot_prefixes_bot_position_uidx').on(table.botId, table.position),
    positionNonNegative: check('subbot_prefixes_position_non_negative', sql`${table.position} >= 0`),
}));

export const subbotOwners = botRuntimeSchema.table('subbot_owners', {
    botId: text('bot_id').notNull().references(() => subbots.id, {onDelete: 'cascade'}),
    ownerId: text('owner_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    position: integer('position').notNull(),
}, table => ({
    pk: primaryKey({columns: [table.botId, table.ownerId]}),
    botPositionUnique: uniqueIndex('subbot_owners_bot_position_uidx').on(table.botId, table.position),
    positionNonNegative: check('subbot_owners_position_non_negative', sql`${table.position} >= 0`),
}));

export const botChatMemberships = botRuntimeSchema.table('bot_chat_memberships', {
    botId: text('bot_id').notNull().references(() => subbots.id, {onDelete: 'cascade'}),
    chatId: text('chat_id').notNull().references(() => chats.id, {onDelete: 'cascade'}),
    joined: boolean('joined').notNull().default(true),
    joinedAt: timestamp('joined_at', {withTimezone: true}).notNull().defaultNow(),
    leftAt: timestamp('left_at', {withTimezone: true}),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    pk: primaryKey({columns: [table.botId, table.chatId]}),
    botJoinedIdx: index('bot_chat_memberships_bot_joined_idx').on(table.botId, table.joined),
    stateCheck: check('bot_chat_memberships_state_check', sql`(${table.joined} AND ${table.leftAt} IS NULL) OR (NOT ${table.joined} AND ${table.leftAt} IS NOT NULL)`),
}));

export const characters = botContentSchema.table('characters', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    tipo: text('tipo'),
    anime: text('anime'),
    rareza: text('rareza'),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    urlUnique: uniqueIndex('characters_url_uidx').on(table.url),
}));

export const characterOwnerships = botContentSchema.table('character_ownerships', {
    characterId: integer('character_id').primaryKey().references(() => characters.id, {onDelete: 'cascade'}),
    ownerId: text('owner_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    acquiredAt: timestamp('acquired_at', {withTimezone: true}).notNull().defaultNow(),
});

export const characterPriceEvents = botContentSchema.table('character_price_events', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    characterId: integer('character_id').notNull().references(() => characters.id, {onDelete: 'cascade'}),
    eventType: text('event_type').notNull(),
    price: integer('price').notNull(),
    actorId: text('actor_id').references(() => usuarios.id, {onDelete: 'set null'}),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    characterCreatedIdx: index('character_price_events_character_created_idx').on(table.characterId, table.createdAt),
    typeCheck: check('character_price_events_type_check', sql`${table.eventType} in ('initial', 'vote', 'listing', 'sale', 'adjustment')`),
    priceNonNegative: check('character_price_events_price_non_negative', sql`${table.price} >= 0`),
}));

export const characterMarketListings = botContentSchema.table('character_market_listings', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    characterId: integer('character_id').notNull().references(() => characters.id, {onDelete: 'cascade'}),
    sellerId: text('seller_id').notNull().references(() => usuarios.id, {onDelete: 'restrict'}),
    buyerId: text('buyer_id').references(() => usuarios.id, {onDelete: 'set null'}),
    askingPrice: integer('asking_price').notNull(),
    previousPrice: integer('previous_price'),
    status: text('status').notNull().default('active'),
    listedAt: timestamp('listed_at', {withTimezone: true}).notNull().defaultNow(),
    closedAt: timestamp('closed_at', {withTimezone: true}),
}, table => ({
    characterStatusIdx: index('character_market_listings_character_status_idx').on(table.characterId, table.status),
    oneActiveListing: uniqueIndex('character_market_listings_one_active_uidx').on(table.characterId)
        .where(sql`${table.status} = 'active'`),
    pricePositive: check('character_market_listings_price_positive', sql`${table.askingPrice} > 0`),
    statusCheck: check('character_market_listings_status_check', sql`${table.status} in ('active', 'withdrawn', 'sold')`),
    closedStateCheck: check('character_market_listings_closed_state_check', sql`(${table.status} = 'active' AND ${table.closedAt} IS NULL) OR (${table.status} <> 'active' AND ${table.closedAt} IS NOT NULL)`),
}));

export const reportes = botRuntimeSchema.table('reports', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    senderId: text('sender_id').notNull().references(() => usuarios.id, {onDelete: 'cascade'}),
    senderName: text('sender_name'),
    mensaje: text('mensaje').notNull(),
    fecha: timestamp('fecha', {withTimezone: true}).notNull().defaultNow(),
    tipo: text('tipo').notNull().default('reporte'),
});

export const reportDeliveries = botRuntimeSchema.table('report_deliveries', {
    reportId: integer('report_id').primaryKey().references(() => reportes.id, {onDelete: 'cascade'}),
    status: text('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', {withTimezone: true}).notNull().defaultNow(),
    lockedBy: text('locked_by'),
    lockedUntil: timestamp('locked_until', {withTimezone: true}),
    lastError: text('last_error'),
    deliveredMessageId: text('delivered_message_id'),
    sentAt: timestamp('sent_at', {withTimezone: true}),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    statusCheck: check('report_deliveries_status_check', sql`${table.status} in ('pending', 'processing', 'sent', 'dead')`),
    attemptNonNegative: check('report_deliveries_attempt_non_negative', sql`${table.attemptCount} >= 0`),
    pendingIdx: index('report_deliveries_pending_idx').on(table.status, table.nextAttemptAt),
    lockIdx: index('report_deliveries_lock_idx').on(table.lockedUntil),
}));

export const chatMemory = botAiSchema.table('chat_memory', {
    chatId: text('chat_id').primaryKey(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const chatMemoryMessages = botAiSchema.table('chat_memory_messages', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    chatId: text('chat_id').notNull().references(() => chatMemory.chatId, {onDelete: 'cascade'}),
    position: integer('position').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    chatPositionUnique: uniqueIndex('chat_memory_messages_chat_position_uidx').on(table.chatId, table.position),
    chatCreatedAtIdx: index('chat_memory_messages_chat_created_at_idx').on(table.chatId, table.createdAt),
    positionNonNegative: check('chat_memory_messages_position_non_negative', sql`${table.position} >= 0`),
    roleCheck: check('chat_memory_messages_role_check', sql`${table.role} in ('system', 'user', 'assistant')`),
}));

export const stats = botRuntimeSchema.table('stats', {
    command: text('command').primaryKey(),
    count: integer('count').notNull().default(1),
}, table => ({
    countNonNegative: check('stats_count_non_negative', sql`${table.count} >= 0`),
}));

/** @deprecated Usa `encryptedSecrets`; se mantiene el alias durante la migración de servicios. */
export const apiTokens = encryptedSecrets;

export const audioResponses = botContentSchema.table('audio_responses', {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    scope: text('scope').notNull(),
    phrase: text('phrase').notNull(),
    regex: text('regex').notNull(),
    deleted: boolean('deleted').notNull().default(false),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
}, table => ({
    scopePhraseUnique: uniqueIndex('audio_responses_scope_phrase_uidx').on(table.scope, table.phrase),
}));

export const audioResponseAssets = botContentSchema.table('audio_response_assets', {
    responseId: uuid('response_id').notNull().references(() => audioResponses.id, {onDelete: 'cascade'}),
    mediaUrl: text('media_url').notNull(),
    position: integer('position').notNull(),
}, table => ({
    pk: primaryKey({columns: [table.responseId, table.mediaUrl]}),
    responsePositionUnique: uniqueIndex('audio_response_assets_response_position_uidx').on(table.responseId, table.position),
    positionNonNegative: check('audio_response_assets_position_non_negative', sql`${table.position} >= 0`),
}));
