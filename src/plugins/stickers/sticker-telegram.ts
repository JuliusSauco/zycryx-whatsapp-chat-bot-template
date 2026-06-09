import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import {ENV} from '../../core/env.js';
import {httpJson} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

interface TelegramSticker {
    thumb?: {file_id?: string};
    thumbnail?: {file_id?: string};
}

interface TelegramStickerSetResponse {
    ok?: boolean;
    result?: {
        stickers?: TelegramSticker[];
    };
}

interface TelegramFileResponse {
    ok?: boolean;
    result?: {
        file_path?: string;
    };
}

export default definePlugin({
    help: ['stikertele *<url>*'],
    tags: ['sticker', 'downloader'],
    command: /^(stic?kertele(gram)?)$/i,
    limit: 1,
    register: true,
    async execute(m, {conn, args, usedPrefix, command}) {
    if (!ENV.TELEGRAM_BOT_TOKEN) return m.reply(getRequiredPluginMessage('stickers.telegram.missingConfig'));
    const {packname: f, author: g} = await getStickerExif(m.sender);
    if (!args[0]) throw renderTemplate(getRequiredPluginMessage('stickers.telegram.usage'), {command: usedPrefix + command})
    if (!args[0].match(/(https:\/\/t.me\/addstickers\/)/gi)) throw getRequiredPluginMessage('stickers.telegram.invalidUrl')
    let packName = args[0].replace("https://t.me/addstickers/", "")
    const telegramApi = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;
    const telegramFileApi = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN}`;
    const json = await httpJson<TelegramStickerSetResponse>(`${telegramApi}/getStickerSet?name=${encodeURIComponent(packName)}`, {
        method: "GET",
        headers: {"User-Agent": "GoogleBot"}
    })
    const stickers = json.result?.stickers || [];
    if (!stickers.length) return m.reply(getRequiredPluginMessage('stickers.telegram.emptyPack'));
    m.reply(renderTemplate(getRequiredPluginMessage('stickers.telegram.summary'), {
        count: String(stickers.length),
        seconds: String(stickers.length * 1.5),
    }))
    for (let i = 0; i < stickers.length; i++) {
        let fileId = stickers[i].thumb?.file_id || stickers[i].thumbnail?.file_id;
        if (!fileId) continue;
        const jisin = await httpJson<TelegramFileResponse>(`${telegramApi}/getFile?file_id=${fileId}`)
        if (!jisin.result?.file_path) continue;
        let stiker = await sticker(false, `${telegramFileApi}/${jisin.result.file_path}`, f, g)
        await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
            contextInfo: {
                'forwardingScore': 200,
                'isForwarded': false,
                externalAdReply: {
                        showAdAttribution: false,
                        title: info.wm,
                        body: getRequiredPluginMessage('stickers.telegram.packBody'),
                    mediaType: 2,
                    sourceUrl: info.nna,
                    thumbnail: m.pp
                }
            }
        })
        await delay(3000)
    }
    throw getRequiredPluginMessage('stickers.telegram.unexpectedError')
    }
})

const delay = (time: number) => new Promise(res => setTimeout(res, time))
