import fetch from "node-fetch"
import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import {ENV} from '../../core/env.js';

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
    if (!ENV.TELEGRAM_BOT_TOKEN) return m.reply('❌ TELEGRAM_BOT_TOKEN no está configurado.');
    const {packname: f, author: g} = await getStickerExif(m.sender);
    if (!args[0]) throw `⚠️ 𝙉𝙂𝙍𝙀𝙎𝙀 𝙀𝙇 𝙀𝙉𝙇𝘼𝘾𝙀 𝘿𝙀 𝙎𝙏𝙄𝘾𝙆𝙀𝙍 𝙏𝙀𝙇𝙀𝙂𝙍𝘼𝙈\n𝙀𝙅𝙀𝙈𝙋𝙇𝙊:\n${usedPrefix + command} https://t.me/addstickers/Porcientoreal`
    if (!args[0].match(/(https:\/\/t.me\/addstickers\/)/gi)) throw `⚠️ 𝙇𝘼 𝙐𝙍𝙇 𝙀𝙎 𝙄𝙉𝘾𝙊𝙍𝙍𝙀𝘾𝙏𝘼\n𝙏𝙃𝙀 𝙐𝙍𝙇 𝙄𝙎 𝙄𝙉𝘾𝙊𝙍𝙍𝙀𝘾𝙏`
    let packName = args[0].replace("https://t.me/addstickers/", "")
    const telegramApi = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;
    const telegramFileApi = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN}`;
    let gas = await fetch(`${telegramApi}/getStickerSet?name=${encodeURIComponent(packName)}`, {
        method: "GET",
        headers: {"User-Agent": "GoogleBot"}
    })
    if (!gas.ok) throw new Error(`Telegram API error ${gas.status}`)
    let json = await gas.json() as TelegramStickerSetResponse
    const stickers = json.result?.stickers || [];
    if (!stickers.length) return m.reply('❌ No se encontraron stickers en ese pack.');
    m.reply(`✔️ *𝙎𝙏𝙄𝘾𝙆𝙀𝙍 𝙏𝙊𝙏𝘼𝙇𝙀𝙎:* ${stickers.length}\n*𝙀𝙉𝙑𝙄𝘼𝘿𝙊 𝙀𝙇:* ${stickers.length * 1.5} Segundos`.trim())
    for (let i = 0; i < stickers.length; i++) {
        let fileId = stickers[i].thumb?.file_id || stickers[i].thumbnail?.file_id;
        if (!fileId) continue;
        let gasIn = await fetch(`${telegramApi}/getFile?file_id=${fileId}`)
        let jisin = await gasIn.json() as TelegramFileResponse
        if (!jisin.result?.file_path) continue;
        let stiker = await sticker(false, `${telegramFileApi}/${jisin.result.file_path}`, f, g)
        await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
            contextInfo: {
                'forwardingScore': 200,
                'isForwarded': false,
                externalAdReply: {
                    showAdAttribution: false,
                    title: info.wm,
                    body: `🍫 PACK DE STICKERS`,
                    mediaType: 2,
                    sourceUrl: info.nna,
                    thumbnail: m.pp
                }
            }
        })
        await delay(3000)
    }
    throw `⚠️ ERROR QUE PASO? NOSE TU SABES? INFORMARLE A MI CREATOR PARA QUE LOS ARREGLE EN VAGO ESE JJJJ`
    }
})

const delay = (time: number) => new Promise(res => setTimeout(res, time))
