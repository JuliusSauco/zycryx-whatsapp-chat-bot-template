import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {ENV} from '../../core/env.js';
import {getTelegramStickerFiles, parseTelegramPackName} from '../../providers/media-conversion/sticker.provider.js';

export default defineSdkPlugin({
    help: ['stikertele *<url>*'],
    tags: ['sticker', 'downloader'],
    command: /^(stic?kertele(gram)?)$/i,
    limit: 1,
    register: true,
    async execute(m, {sdk}) {
    if (!ENV.TELEGRAM_BOT_TOKEN) return sdk.reply.message('stickers.telegram.missingConfig');
    const {packname: f, author: g} = await getStickerExif(sdk.sender);
    if (!sdk.args[0]) throw sdk.content.renderMessage('stickers.telegram.usage', {command: sdk.usedPrefix + sdk.command})
    if (!sdk.args[0].match(/(https:\/\/t.me\/addstickers\/)/gi)) throw sdk.content.message('stickers.telegram.invalidUrl')
    const files = await getTelegramStickerFiles(parseTelegramPackName(sdk.args[0]));
    if (!files.length) return sdk.reply.message('stickers.telegram.emptyPack');
    await sdk.reply.message('stickers.telegram.summary', {
        count: String(files.length),
        seconds: String(files.length * 1.5),
    })
    for (const file of files) {
        let stiker = await sticker(false, file.fileUrl, f, g)
        await sdk.sendFile(stiker, 'sticker.webp', '', m, true, {
            contextInfo: {
                'forwardingScore': 200,
                'isForwarded': false,
                externalAdReply: {
                        showAdAttribution: false,
                        title: sdk.branding.watermark,
                        body: sdk.content.message('stickers.telegram.packBody'),
                    mediaType: 2,
                    sourceUrl: info.nna,
                    thumbnail: m.pp
                }
            }
        })
        await delay(3000)
    }
    throw sdk.content.message('stickers.telegram.unexpectedError')
    }
})

const delay = (time: number) => new Promise(res => setTimeout(res, time))
