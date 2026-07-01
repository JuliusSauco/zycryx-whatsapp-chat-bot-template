import {logInfo} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {ENV} from '../../core/env.js';
import {getEmojiMixUrls} from '../../providers/media-conversion/sticker.provider.js';

export default defineSdkPlugin({
    help: ['emojimix'].map((v) => v + ' emot1|emot2>'),
    tags: ['sticker'],
    command: /^(emojimix|emogimix|combinaremojis|crearemoji|emojismix|emogismix)$/i,
    register: true,
    limit: 1,
    async execute(m, {sdk}) {
    if (!ENV.TENOR_API_KEY) return sdk.reply.message('stickers.emojiMix.missingConfig');
    const {packname: f, author: g} = await getStickerExif(sdk.sender);
    if (!sdk.args[0]) return sdk.reply.message('stickers.emojiMix.usage', {command: sdk.usedPrefix + sdk.command})
//conn.fakeReply(m.chat, `Calma crack estoy procesando 👏\n\n> *Esto puede demorar unos minutos*`, '0@s.whatsapp.net', `No haga spam gil`, 'status@broadcast', null, fake)
    try {
        let [emoji1, emoji2] = sdk.text.split('+')
        for (const imageUrl of await getEmojiMixUrls(emoji1, emoji2)) {
            let stiker = await sticker(false, imageUrl, f, g)
            await sdk.sendFile(stiker, 'sticker.webp', '', m, true, {
                contextInfo: {
                    'forwardingScore': 200,
                    'isForwarded': false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title: sdk.branding.watermark,
                        body: ``,
                        mediaType: 2,
                        sourceUrl: info.md,
                        thumbnail: m.pp
                    }
                }
            })
        }
    } catch (e: unknown) {
        logInfo(e)
    }
    }
})
