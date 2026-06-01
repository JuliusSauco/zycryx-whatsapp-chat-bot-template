import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const env = process.env.NODE_ENV || 'local';
const envFile = path.resolve(`.env.${env}`);

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
    BOT_OWNER_NUMBERS: process.env.BOT_OWNER_NUMBERS || '',
    BOT_FIXED_OWNER_JIDS: process.env.BOT_FIXED_OWNER_JIDS || '',
    DATA_SOURCE: process.env.DATA_SOURCE || 'local',
    BACKEND_PROTOCOL: process.env.BACKEND_PROTOCOL || 'rest',
    BACKEND_BASE_URL: process.env.BACKEND_BASE_URL || '',
    BACKEND_API_TOKEN: process.env.BACKEND_API_TOKEN || '',
    BACKEND_TIMEOUT_MS: parseInt(process.env.BACKEND_TIMEOUT_MS || '10000', 10),
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
    DEFAULT_MENU_IMAGE: process.env.DEFAULT_MENU_IMAGE || './media/Menu2.jpg',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_NAME: process.env.DB_NAME || 'zycryx_bot',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_SCHEMA: process.env.DB_SCHEMA || 'public',
    DATABASE_URL: process.env.DATABASE_URL || '',
    PERF_LOG_THRESHOLD_MS: parseInt(process.env.PERF_LOG_THRESHOLD_MS || '750', 10),
} as const;
