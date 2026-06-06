import {sticker} from '../../lib/sticker.js';
import {getStickerExif} from '../../services/sticker-settings.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import {httpJson} from '../../lib/http-client.js';

interface QuoteGenerateResponse {
    result?: {
        image?: string;
    };
}

export default definePlugin({
    help: ['qc'],
    tags: ['sticker'],
    command: /^(qc)$/i,
    register: true,
    async execute(m, {conn, args}) {
    const {packname: f, author: g} = await getStickerExif(m.sender);
    let text
    if (args.length >= 1) {
        text = args.slice(0).join(" ");
    } else if (m.quoted && m.quoted.text) {
        text = m.quoted.text;
    } else return m.reply("╰⊱❗️⊱ *𝙇𝙊 𝙐𝙎𝙊́ 𝙈𝘼𝙇* ⊱❗️⊱╮\n\n𝘼𝙂𝙍𝙀𝙂𝙐𝙀́ 𝙐𝙉 𝙏𝙀𝙓𝙏𝙊 𝙋𝘼𝙍𝘼 𝘾𝙍𝙀𝘼𝙍 𝙀𝙇 𝙎𝙏𝙄𝘾𝙆𝙀𝙍")
    if (!text) return m.reply("╰⊱❗️⊱ *𝙇𝙊 𝙐𝙎𝙊́ 𝙈𝘼𝙇* ⊱❗️⊱╮\n\n𝘼𝙂𝙍𝙀𝙂𝙐𝙀́ 𝙐𝙉 𝙏𝙀𝙓𝙏𝙊 𝙋𝘼𝙍𝘼 𝘾𝙍𝙀𝘼𝙍 𝙀𝙇 𝙎𝙏𝙄𝘾𝙆𝙀𝙍")
//conn.fakeReply(m.chat, `Calma crack estoy procesando 👏\n\n> *Esto puede demorar unos minutos*`, '0@s.whatsapp.net', `No haga spam gil`, 'status@broadcast', null, fake)
    const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user?.id || m.sender : m.sender;
    const mentionRegex = new RegExp(`@${who.split('@')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
    const mishi = text.replace(mentionRegex, '');
    if (mishi.length > 65) return m.reply('*⚠️ El texto no puede tener mas de 65 caracteres*');
    const pp = await conn.profilePictureUrl(who).catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
    const nombre = await conn.getName(who)
    const obj = {
        "type": "quote",
        "format": "png",
        "backgroundColor": "#000000",
        "width": 512,
        "height": 768,
        "scale": 2,
        "messages": [{
            "entities": [],
            "avatar": true,
            "from": {"id": 1, "name": `${nombre || who.split('@')[0]}`, "photo": {url: `${pp}`}},
            "text": mishi,
            "replyMessage": {}
        }]
    };
    const json = await httpJson<QuoteGenerateResponse>('https://bot.lyo.su/quote/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(obj),
    });
    if (!json.result?.image) throw new Error('Quote API no devolvió imagen');
    const buffer = Buffer.from(json.result.image, 'base64');
    let stiker = await sticker(buffer, false, f, g)
//sticker(buffer, false, global.packname, global.author);
    if (stiker) return conn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
        contextInfo: {
            'forwardingScore': 200,
            'isForwarded': false,
            externalAdReply: {
                showAdAttribution: false,
                title: info.wm,
                body: info.vs,
                mediaType: 2,
                sourceUrl: info.md,
                thumbnail: m.pp
            }
        }
    })
    }
});
