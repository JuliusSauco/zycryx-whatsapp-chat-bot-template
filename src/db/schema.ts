import {sql} from 'drizzle-orm';
import {bigint, boolean, date, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp} from 'drizzle-orm/pg-core';

export const usuarios = pgTable('usuarios', {
    id: text('id').primaryKey(),
    nombre: text('nombre'),
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
    money: integer('money').default(100),
    limite: integer('limite').default(10),
    exp: integer('exp').default(0),
    banco: integer('banco').default(0),
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
    lastslut: bigint('lastslut', {mode: 'number'}).default(0),
    timevot: bigint('timevot', {mode: 'number'}).default(0),
    wait: bigint('wait', {mode: 'number'}).default(0),
    crime: bigint('crime', {mode: 'number'}).default(0),
    marry: text('marry'),
    marryRequest: text('marry_request'),
});

export const groupSettings = pgTable('group_settings', {
    groupId: text('group_id').primaryKey(),
    welcomeConfigId: serial('welcome_config_id'),
    welcome: boolean('welcome').default(true),
    detect: boolean('detect').default(true),
    antifake: boolean('antifake').default(false),
    antilink: boolean('antilink').default(false),
    antilink2: boolean('antilink2').default(false),
    virusTotal: boolean('virustotal').default(false),
    modohorny: boolean('modohorny').default(false),
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
    messageLogging: boolean('message_logging').default(false),
});

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
