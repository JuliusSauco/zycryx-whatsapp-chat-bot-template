import fetch from 'node-fetch'
import uploadImage from '../../lib/uploadImage.js'
import {definePlugin} from '../../core/define-plugin.js'

interface ReminiResponse {
    status?: boolean;
    data?: {
        url?: string;
    };
}

export default definePlugin({
    help: ['hd', 'remini', 'enhance'],
    tags: ['tools'],
    command: ['hd', 'remini', 'enhance'],
    register: true,
    limit: 1,
    async execute(m, {conn, usedPrefix, command}) {
    try {
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || q.mediaType || ""
        if (!mime.startsWith('image')) return m.reply(`⚠️ *Responde a una imagen para mejorarla en HD.*`)
        await m.react('⌛')

        let img = await q.download?.()
        if (!img) return m.reply(`❌ No se pudo descargar la imagen.`)
        let url = await uploadImage(img)
        if (!info.neoxr.key) return m.reply('❌ NEOXR_API_KEY no está configurado.')
        let res = await fetch(`${info.neoxr.url}/remini?image=${encodeURIComponent(url)}&apikey=${info.neoxr.key}`)
        let json = await res.json() as ReminiResponse
        if (!json.status || !json.data?.url) return m.reply('❌ No se pudo mejorar la imagen.')
        await conn.sendFile(m.chat, json.data.url, 'hd.jpg', `✅ *Aquí está tu imagen en HD*`, m)
        await m.react('✅')
    } catch (e: unknown) {
        console.error(e)
        await m.react('❌')
        m.reply(`❌ Error: ${e instanceof Error ? e.message : String(e)}`)
    }
    }
})
