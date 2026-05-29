import {sticker} from '../lib/sticker.js'
import fetch from 'node-fetch'
import {getStickerExif} from '../services/sticker-settings.service.js';
import {definePlugin} from '../core/define-plugin.js';
import {ENV} from '../core/env.js';

export default definePlugin({
    help: ['emojimix'].map((v: any) => v + ' emot1|emot2>'),
    tags: ['sticker'],
    command: /^(emojimix|emogimix|combinaremojis|crearemoji|emojismix|emogismix)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, args, usedPrefix, command}) {
    if (!ENV.TENOR_API_KEY) return m.reply('❌ TENOR_API_KEY no está configurado.');
    const legacyConn = conn as any
    const {packname: f, author: g} = await getStickerExif(m.sender);
    if (!args[0]) return m.reply(`⚠️ 𝘿𝙚𝙗𝙚𝙨 𝙙𝙚 𝙪𝙨𝙖𝙧 2 𝙚𝙢𝙤𝙟𝙞𝙨 𝙮 𝙚𝙣 𝙢𝙚𝙙𝙞𝙤 𝙪𝙨𝙖𝙧 𝙚𝙡 *+*\n• 𝙀𝙟𝙚𝙢𝙥𝙡𝙤 :\n*${usedPrefix + command}* 😺+😆`)
//conn.fakeReply(m.chat, `Calma crack estoy procesando 👏\n\n> *Esto puede demorar unos minutos*`, '0@s.whatsapp.net', `No haga spam gil`, 'status@broadcast', null, fake)
    try {
        let [emoji1, emoji2] = text.split('+')
        // @ts-ignore
        let anu = await fetchJson(`https://tenor.googleapis.com/v2/featured?key=${ENV.TENOR_API_KEY}&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`)
        // @ts-ignore
        for (let res of anu.results) {
            // @ts-ignore
            let stiker = await sticker(false, res.url, f, g)
            legacyConn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
                contextInfo: {
                    'forwardingScore': 200,
                    'isForwarded': false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title: info.wm,
                        body: ``,
                        mediaType: 2,
                        sourceUrl: info.md,
                        thumbnail: m.pp
                    }
                }
            }, {quoted: m})
        }
    } catch (e: any) {
        console.log(e)
    }
    }
})

const fetchJson = (url: any, options: any) => new Promise(async (resolve, reject) => {
    fetch(url, options)
        .then(response => response.json())
        .then(json => {
            resolve(json)
        })
        .catch((err) => {
            reject(err)
        })
})
