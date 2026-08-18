import {botInfo} from '../core/config.js';
import {getUserStickerSettings, setUserStickerSettings} from './user.service.js';

export async function getStickerExif(userId: string): Promise<{packname: string; author: string}> {
    const settings = await getUserStickerSettings(userId);
    const packname = settings?.sticker_packname || botInfo.packname;
    const author = settings?.sticker_packname
        ? settings.sticker_author || ''
        : botInfo.author;

    return {packname, author};
}

export async function setStickerExif(userId: string, packname: string, author: string | null): Promise<void> {
    await setUserStickerSettings(userId, packname, author);
}
