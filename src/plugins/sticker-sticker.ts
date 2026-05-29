import {sticker} from '../lib/sticker.js'
import uploadFile from '../lib/uploadFile.js'
import uploadImage from '../lib/uploadImage.js'
import {webp2png} from '../lib/webp2mp4.js'
import {getStickerExif} from '../services/sticker-settings.service.js';
import {definePlugin} from '../core/define-plugin.js';

export default definePlugin({
    help: ['sticker'],
    tags: ['sticker'],
    command: ['s', 'sticker'],
    register: true,
    async execute(m, {conn, args, usedPrefix, command}) {
    const legacyConn = conn as any
    let stiker = false;
    const {packname: f, author: g} = await getStickerExif(m.sender);
    try {
        let q = m.quoted ? m.quoted : m
        let mime = q.msg?.mimetype || q.mimetype || q.mediaType || ''
        if (/webp|image|video/g.test(mime)) {
            if (/video/g.test(mime)) if ((q.msg?.seconds || q.seconds || 0) > 18) return m.reply('⚠️ ¿Dónde has visto un sticker de 15 segundos, pendejo? Haz el video más corto, con un máximo de 12 segundos.')
            let img = await q.download?.()
            if (!img) return m.reply(`*Y la imagen? 🤔 Responde a una imagen para hacer el sticker. Usa:* ${usedPrefix + command}`)
            let out
            try {
                // @ts-ignore
                stiker = await sticker(img, false, f, g)
            } catch (e: any) {
                console.error(e)
            } finally {
//conn.reply(m.chat, `Calma crack estoy haciendo tu sticker 👏\n\n> *Recuerda los video son de 7 segundos*`, m)
                if (!stiker) {
                    if (/webp/g.test(mime)) out = await webp2png(img)
                    else if (/image/g.test(mime)) out = await uploadImage(img)
                    else if (/video/g.test(mime)) out = await uploadFile(img)
                    if (typeof out !== 'string') out = await uploadImage(img)
                    // @ts-ignore
                    stiker = await sticker(false, out, f, g)
                }
            }
        } else if (args[0]) {
            // @ts-ignore
            if (isUrl(args[0])) stiker = await sticker(false, args[0], f, g)
            else return m.reply('URL invalido')
        }
    } catch (e: any) {
        console.error(e)
        if (!stiker) stiker = e
    } finally {
        if (stiker) legacyConn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
            contextInfo: {
                'forwardingScore': 200,
                'isForwarded': false,
                externalAdReply: {
                    showAdAttribution: false,
                    title: info.wm,
                    body: ``,
                    mediaType: 2,
                    sourceUrl: [info.nna, info.nna2, info.md, info.yt].getRandom(),
                    thumbnail: m.pp
                }
            }
        }, {quoted: m})
        else return m.reply(`*Y la imagen? 🤔 Responde a una imagen para hacer el sticker. Usa:* ${usedPrefix + command}`)
    }
    }
})

const isUrl = (text: any) => {
    return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/, 'gi'))
}
