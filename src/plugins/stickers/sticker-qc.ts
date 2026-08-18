import {botInfo} from "../../core/config.js";
import {sticker} from '../../lib/sticker.js';
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {generateQuoteCard} from '../../providers/media-conversion/sticker.provider.js';

export default defineSdkPlugin({
    help: ['qc'],
    tags: ['sticker'],
    command: /^(qc)$/i,
    register: true,
    async execute(m, {sdk}) {
    const {packname: f, author: g} = await getStickerExif(sdk.sender);
    let text
    if (sdk.args.length >= 1) {
        text = sdk.args.slice(0).join(" ");
    } else if (m.quoted && m.quoted.text) {
        text = m.quoted.text;
    } else return sdk.reply.message('stickers.quote.usage')
    if (!text) return sdk.reply.message('stickers.quote.usage')
//conn.fakeReply(m.chat, `Calma crack estoy procesando 👏\n\n> *Esto puede demorar unos minutos*`, '0@s.whatsapp.net', `No haga spam gil`, 'status@broadcast', null, fake)
    const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? sdk.conn.user?.id || sdk.sender : sdk.sender;
    const mentionRegex = new RegExp(`@${who.split('@')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
    const mishi = text.replace(mentionRegex, '');
    if (mishi.length > 65) return sdk.reply.message('stickers.quote.tooLong');
    const pp = await sdk.conn.profilePictureUrl(who).catch(() => null) || 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
    const nombre = await sdk.conn.getName(who)
    const buffer = await generateQuoteCard({
        name: `${nombre || who.split('@')[0]}`,
        avatarUrl: pp,
        text: mishi,
    });
    let stiker = await sticker(buffer, false, f, g)
    if (stiker) return sdk.sendFile(stiker, 'sticker.webp', '', m, true, {
        contextInfo: {
            'forwardingScore': 200,
            'isForwarded': false,
            externalAdReply: {
                showAdAttribution: false,
                title: sdk.branding.watermark,
                body: botInfo.vs,
                mediaType: 2,
                sourceUrl: botInfo.md,
                thumbnail: m.pp
            }
        }
    })
    }
});
