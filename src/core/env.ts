import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const env = process.env.NODE_ENV || 'local';
const envFile = path.resolve(`.env.${env}`);

function positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function integerAtLeast(value: string | undefined, fallback: number, minimum: number): number {
    const parsed = positiveInteger(value, fallback);
    return parsed >= minimum ? parsed : fallback;
}

function authStateSource(value: string | undefined): 'database' | 'files' {
    return value?.toLowerCase() === 'files' ? 'files' : 'database';
}

if (fs.existsSync(envFile)) {
    dotenv.config({path: envFile});
    console.log(`✅ Variables de entorno cargadas desde: .env.${env}`);
} else {
    console.warn(`⚠️ No se encontró el archivo .env.${env}, usando variables del sistema.`);
    dotenv.config();
}

export const ENV = {
    NODE_ENV: env,
    BOT_DISPLAY_NAME: process.env.BOT_DISPLAY_NAME || 'Zycryx Bot',
    BOT_PACKAGE_NAME: process.env.BOT_PACKAGE_NAME || 'Zycryx Stickers',
    BOT_AUTHOR: process.env.BOT_AUTHOR || 'Zycryx',
    BOT_BANNER_NAME: process.env.BOT_BANNER_NAME || 'ZYCRYX BOT',
    BOT_BANNER_AUTHOR: process.env.BOT_BANNER_AUTHOR || 'by: Zycryx',
    BOT_REPOSITORY_URL: process.env.BOT_REPOSITORY_URL || '',
    BOT_WEBSITE_URL: process.env.BOT_WEBSITE_URL || '',
    BOT_YOUTUBE_URL: process.env.BOT_YOUTUBE_URL || '',
    BOT_TIKTOK_URL: process.env.BOT_TIKTOK_URL || '',
    BOT_FACEBOOK_URL: process.env.BOT_FACEBOOK_URL || '',
    BOT_INSTAGRAM_URL: process.env.BOT_INSTAGRAM_URL || '',
    BOT_GROUP_LINKS: process.env.BOT_GROUP_LINKS || '',
    BOT_CHANNEL_LINKS: process.env.BOT_CHANNEL_LINKS || '',
    BOT_MOD_GROUP_ID: process.env.BOT_MOD_GROUP_ID || '',
    BOT_LINK_MODE: process.env.BOT_LINK_MODE || 'auto',
    BOT_LINK_PHONE: process.env.BOT_LINK_PHONE || '',
    BOT_OWNER_NUMBERS: process.env.BOT_OWNER_NUMBERS || '',
    BOT_FIXED_OWNER_JIDS: process.env.BOT_FIXED_OWNER_JIDS || '',
    API_BASE_URL: process.env.API_BASE_URL || 'https://api.delirius.store',
    API_KEY: process.env.API_KEY || '',
    FGMODS_API_URL: process.env.FGMODS_API_URL || 'https://api.fgmods.xyz/api',
    FGMODS_API_KEY: process.env.FGMODS_API_KEY || '',
    NEOXR_API_URL: process.env.NEOXR_API_URL || 'https://api.neoxr.eu/api',
    NEOXR_API_KEY: process.env.NEOXR_API_KEY || '',
    ACR_HOST: process.env.ACR_HOST || 'identify-eu-west-1.acrcloud.com',
    ACR_ACCESS_KEY: process.env.ACR_ACCESS_KEY || '',
    ACR_ACCESS_SECRET: process.env.ACR_ACCESS_SECRET || '',
    ALYACHAN_API_KEY: process.env.ALYACHAN_API_KEY || '',
    BETABOTZ_API_KEY: process.env.BETABOTZ_API_KEY || '',
    LOLHUMAN_API_KEY: process.env.LOLHUMAN_API_KEY || '',
    TENOR_API_KEY: process.env.TENOR_API_KEY || '',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    SKYULTRA_API_KEY: process.env.SKYULTRA_API_KEY || '',
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY || '',
    ZENKEY_API_KEY: process.env.ZENKEY_API_KEY || '',
    TRANSLATE_API_KEY: process.env.TRANSLATE_API_KEY || '',
    PERPLEXITY_API_KEYS: process.env.PERPLEXITY_API_KEYS || '',
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
    VIRUSTOTAL_API_KEY: process.env.VIRUSTOTAL_API_KEY || '',
    VIRUSTOTAL_ENABLED: (process.env.VIRUSTOTAL_ENABLED || 'true').toLowerCase() !== 'false',
    VIRUSTOTAL_MAX_FILE_MB: positiveInteger(process.env.VIRUSTOTAL_MAX_FILE_MB, 32),
    VIRUSTOTAL_POLL_ATTEMPTS: positiveInteger(process.env.VIRUSTOTAL_POLL_ATTEMPTS, 6),
    VIRUSTOTAL_POLL_INTERVAL_MS: positiveInteger(process.env.VIRUSTOTAL_POLL_INTERVAL_MS, 10_000),
    DEFAULT_MENU_IMAGE: process.env.DEFAULT_MENU_IMAGE || './resources/media/menus/Menu2.jpg',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: positiveInteger(process.env.DB_PORT, 5432),
    DB_NAME: process.env.DB_NAME || 'zycryx_bot',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    DB_POOL_MAX: positiveInteger(process.env.DB_POOL_MAX, 20),
    DB_IDLE_TIMEOUT_MS: positiveInteger(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
    DB_CONNECTION_TIMEOUT_MS: positiveInteger(process.env.DB_CONNECTION_TIMEOUT_MS, 10_000),
    DB_STATEMENT_TIMEOUT_MS: positiveInteger(process.env.DB_STATEMENT_TIMEOUT_MS, 30_000),
    LOG_LEVEL: process.env.LOG_LEVEL || 'command',
    PERF_LOG_THRESHOLD_MS: positiveInteger(process.env.PERF_LOG_THRESHOLD_MS, 750),
    HEALTH_PORT: positiveInteger(process.env.HEALTH_PORT, 3000),
    HEALTH_HOST: process.env.HEALTH_HOST || '127.0.0.1',
    HEALTH_METRICS_TOKEN: process.env.HEALTH_METRICS_TOKEN || '',
    CONSOLE_VIEW_TOKEN: process.env.CONSOLE_VIEW_TOKEN || '',
    HTTP_TIMEOUT_MS: positiveInteger(process.env.HTTP_TIMEOUT_MS, 15_000),
    DB_CACHE_TTL_MS: positiveInteger(process.env.DB_CACHE_TTL_MS, 300_000),
    AUDIO_CACHE_TTL_MS: positiveInteger(process.env.AUDIO_CACHE_TTL_MS, 300_000),
    BACKGROUND_TASK_CONCURRENCY: positiveInteger(process.env.BACKGROUND_TASK_CONCURRENCY, 4),
    PLUGIN_HOT_RELOAD_ENABLED: (process.env.PLUGIN_HOT_RELOAD_ENABLED || 'false').toLowerCase() === 'true',
    REQUIRED_PLUGIN_PATHS: process.env.REQUIRED_PLUGIN_PATHS || 'hooks/_antilink,hooks/_antilink2,hooks/_antiprivado,hooks/_virustotal,hooks/_censored',
    MESSAGE_QUEUE_CONCURRENCY: positiveInteger(process.env.MESSAGE_QUEUE_CONCURRENCY, 32),
    MESSAGE_QUEUE_PER_CHAT_LIMIT: positiveInteger(process.env.MESSAGE_QUEUE_PER_CHAT_LIMIT, 50),
    MESSAGE_QUEUE_GLOBAL_LIMIT: positiveInteger(process.env.MESSAGE_QUEUE_GLOBAL_LIMIT, 2_000),
    BAILEYS_AUTH_STATE_SOURCE: authStateSource(process.env.BAILEYS_AUTH_STATE_SOURCE),
    BAILEYS_AUTH_WRITE_DELAY_MS: positiveInteger(process.env.BAILEYS_AUTH_WRITE_DELAY_MS, 25),
    BAILEYS_AUTH_LEASE_SECONDS: integerAtLeast(process.env.BAILEYS_AUTH_LEASE_SECONDS, 120, 30),
    BOT_SECRETS_KEY_VERSION: positiveInteger(process.env.BOT_SECRETS_KEY_VERSION, 1),
    BOT_SECRETS_MASTER_KEY_B64: process.env.BOT_SECRETS_MASTER_KEY_B64 || '',
    BOT_SECRETS_KEYRING_JSON: process.env.BOT_SECRETS_KEYRING_JSON || '',
    BOT_SECRETS_PASSPHRASE: process.env.BOT_SECRETS_PASSPHRASE || '',
    BOT_SECRETS_KDF_SALT_B64: process.env.BOT_SECRETS_KDF_SALT_B64 || '',
} as const;
