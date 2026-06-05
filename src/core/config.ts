import {logError, logInfo, logWarn} from '../lib/logger.js';
import fs, {unwatchFile, watchFile} from 'fs'
import chalk from 'chalk'
import {fileURLToPath} from 'url'
import type {BotInfo} from '../types/config.js'
import {ENV} from './env.js'

const splitList = (value: string): string[] => value.split(',').map(v => v.trim()).filter(Boolean);
const groupLinks = splitList(ENV.BOT_GROUP_LINKS);
const channelLinks = splitList(ENV.BOT_CHANNEL_LINKS);
const configuredOwners = splitList(ENV.BOT_OWNER_NUMBERS).map(v => [v.replace(/[^0-9]/g, '')]).filter(([v]) => v);
const menuImagePath = ENV.DEFAULT_MENU_IMAGE || './media/Menu2.jpg';
const menuImage = fs.existsSync(menuImagePath) ? fs.readFileSync(menuImagePath) : Buffer.alloc(0);

//owner
global.owner = configuredOwners;

//Información
globalThis.info = {
    wm: ENV.BOT_DISPLAY_NAME,
    vs: "2.0.0",
    packname: ENV.BOT_PACKAGE_NAME,
    author: ENV.BOT_AUTHOR,
    apis: ENV.API_BASE_URL,
    apikey: ENV.API_KEY,
    fgmods: {url: ENV.FGMODS_API_URL, key: ENV.FGMODS_API_KEY},
    neoxr: {url: ENV.NEOXR_API_URL, key: ENV.NEOXR_API_KEY},
    img2: ENV.BOT_WEBSITE_URL || "https://telegra.ph/file/39fb047cdf23c790e0146.jpg",
    img4: menuImage,
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
} as BotInfo;

//----------------------------------------------------

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    logInfo(chalk.redBright("Update 'config.ts'"))
    import(`${file}?update=${Date.now()}`)
})
