import {logWarn} from '../lib/logger.js';
import {readFile} from 'node:fs/promises';
import type {BotInfo} from '../types/config.js'
import {ENV} from './env.js'
import {mergeOwnerNumbers} from '../utils/owner-numbers.js';

const splitList = (value: string): string[] => value.split(',').map(v => v.trim()).filter(Boolean);
const groupLinks = splitList(ENV.BOT_GROUP_LINKS);
const channelLinks = splitList(ENV.BOT_CHANNEL_LINKS);
const legacyOwners = splitList(ENV.BOT_FIXED_OWNER_JIDS);
if (legacyOwners.length) {
    logWarn('[DEPRECATION] BOT_FIXED_OWNER_JIDS ahora se interpreta como owner. Migra sus valores a BOT_OWNER_NUMBERS; la compatibilidad se retirará en una versión futura.');
}
export const configuredOwners = mergeOwnerNumbers(ENV.BOT_OWNER_NUMBERS, ENV.BOT_FIXED_OWNER_JIDS);
const menuImagePath = ENV.DEFAULT_MENU_IMAGE || './resources/media/menus/Menu2.jpg';
let menuImageBuffer = Buffer.alloc(0);

// Información inmutable del proceso; los consumidores la importan explícitamente.
export const botInfo: Readonly<BotInfo> = Object.freeze({
    wm: ENV.BOT_DISPLAY_NAME,
    vs: "2.0.0",
    packname: ENV.BOT_PACKAGE_NAME,
    author: ENV.BOT_AUTHOR,
    img2: ENV.BOT_WEBSITE_URL || "https://telegra.ph/file/39fb047cdf23c790e0146.jpg",
    get img4() { return menuImageBuffer; },
    yt: ENV.BOT_YOUTUBE_URL,
    tiktok: ENV.BOT_TIKTOK_URL,
    md: ENV.BOT_REPOSITORY_URL,
    fb: ENV.BOT_FACEBOOK_URL,
    ig: ENV.BOT_INSTAGRAM_URL,
    nn: groupLinks[0] || '',
    nn2: groupLinks[1] || '',
    nn3: groupLinks[2] || '',
    nn4: groupLinks[3] || '',
    nn5: groupLinks[4] || '',
    nn6: groupLinks[5] || '',
    nna: channelLinks[0] || '',
    nna2: channelLinks[1] || ''
});

export async function preloadConfigResources(): Promise<void> {
    menuImageBuffer = await readFile(menuImagePath).catch(() => Buffer.alloc(0));
}
