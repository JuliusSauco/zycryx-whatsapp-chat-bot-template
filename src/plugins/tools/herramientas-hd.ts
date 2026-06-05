import {logError, logInfo, logWarn} from '../../lib/logger.js';
import uploadImage from '../../lib/uploadImage.js'
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson} from '../../lib/http-client.js'
import {errorMessage, replyFailure, replyUserError} from '../../lib/reply-helpers.js'

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
        if (!mime.startsWith('image')) return replyUserError(m, '*Responde a una imagen para mejorarla en HD.*')
        await m.react('⌛')

        let img = await q.download?.()
        if (!img) return replyFailure(m, 'No se pudo descargar la imagen.')
        let url = await uploadImage(img)
        if (!info.neoxr.key) return replyFailure(m, 'NEOXR_API_KEY no está configurado.')
        let json = await httpJson<ReminiResponse>(`${info.neoxr.url}/remini?image=${encodeURIComponent(url)}&apikey=${info.neoxr.key}`)
        if (!json.status || !json.data?.url) return replyFailure(m, 'No se pudo mejorar la imagen.')
        await conn.sendFile(m.chat, json.data.url, 'hd.jpg', `✅ *Aquí está tu imagen en HD*`, m)
        await m.react('✅')
    } catch (e: unknown) {
        logError(e)
        await m.react('❌')
        return replyFailure(m, `Error: ${errorMessage(e)}`)
    }
    }
})
