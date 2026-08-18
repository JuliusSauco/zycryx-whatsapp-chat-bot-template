import {botInfo} from "../../core/config.js";
import {logError} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import uploadFile from '../../lib/uploadFile.js'
import uploadImage from '../../lib/uploadImage.js'
import {webp2png} from '../../lib/webp2mp4.js'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {pickRandom} from '../../utils/random.js';

export default defineSdkPlugin({
    help: ['sticker'],
    tags: ['sticker'],
    command: ['s', 'sticker'],
    register: true,
    async execute(m, {sdk}) {
    let stiker: Buffer | string | false = false;
    const {packname: f, author: g} = await getStickerExif(sdk.sender);
    try {
        let q = m.quoted ? m.quoted : m
        let mime = q.msg?.mimetype || q.mimetype || q.mediaType || ''
        if (/webp|image|video/g.test(mime)) {
            if (/video/g.test(mime)) if ((q.msg?.seconds || q.seconds || 0) > 18) return sdk.reply.message('stickers.common.stickerVideoTooLong')
            let img = await q.download?.()
            if (!img) return sdk.reply.message('stickers.common.missingStickerMedia', {command: sdk.usedPrefix + sdk.command})
            let out: string | string[] | undefined
            try {
                stiker = await sticker(img, false, f, g)
            } catch (e: unknown) {
                logError(e)
            } finally {
                if (!stiker) {
                    if (/webp/g.test(mime)) out = await webp2png(img)
                    else if (/image/g.test(mime)) out = await uploadImage(img)
                    else if (/video/g.test(mime)) out = await uploadFile(img)
                    if (Array.isArray(out)) out = out[0]
                    if (typeof out !== 'string') out = await uploadImage(img)
                    stiker = await sticker(false, out, f, g)
                }
            }
        } else if (sdk.args[0]) {
            if (isUrl(sdk.args[0])) stiker = await sticker(false, sdk.args[0], f, g)
            else return sdk.reply.message('stickers.common.invalidUrl')
        }
    } catch (e: unknown) {
        logError(e)
    } finally {
        if (stiker) await sdk.sendFile(stiker, 'sticker.webp', '', m, true, {
            contextInfo: {
                'forwardingScore': 200,
                'isForwarded': false,
                externalAdReply: {
                    showAdAttribution: false,
                    title: sdk.branding.watermark,
                    body: ``,
                    mediaType: 2,
                    sourceUrl: pickRandom([botInfo.nna, botInfo.nna2, botInfo.md, botInfo.yt]),
                    thumbnail: m.pp
                }
            }
        })
        else return sdk.reply.message('stickers.common.missingStickerMedia', {command: sdk.usedPrefix + sdk.command})
    }
    }
})

const isUrl = (text: string) => {
    return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/, 'gi'))
}
