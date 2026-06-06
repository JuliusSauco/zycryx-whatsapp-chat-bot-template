import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson, httpRequest} from '../../lib/http-client.js'
import {buildAliasMap, buildAliasRegex} from '../../utils/command-alias.js'
import {pickRandom} from '../../utils/random.js'
import {nsfwContent, type NsfwContentItem} from './nsfw-contenido.data.js'


interface UrlResponse {
    url?: string;
    message?: string;
    [key: string]: unknown;
}


const aliasMap = buildAliasMap<NsfwContentItem>(nsfwContent)

export default definePlugin({
    help: Object.keys(aliasMap),
    tags: ['nsfw'],
    command: buildAliasRegex(aliasMap),
    limit: 2,
    register: true,
    async execute(m, {conn, command}) {
    try {
        const item = aliasMap[command.toLowerCase()]
        if (!item) return m.reply('❌ Comando NSFW no reconocido.')

        if (item.type === 'array') {
            if (!item.array?.length) return m.reply('❌ Fuente NSFW vacía.')
            const url = pickRandom(item.array)
            await conn.sendFile(m.chat, url, 'nsfw.jpg', item.label, m)
            return
        }

        if (item.type === 'json') {
            if (!item.url) return m.reply('❌ Fuente JSON no configurada.')
            const data = await httpJson<string[]>(item.url)
            const img = pickRandom(data)
            await conn.sendFile(m.chat, img, 'nsfw.jpg', item.label, m)
            return
        }

        if (item.type === 'waifu') {
            if (!item.api) return m.reply('❌ API no configurada.')
            const {url} = await httpJson<UrlResponse>(`https://api.waifu.pics/nsfw/${item.api}`)
            if (!url) return m.reply('❌ La API no devolvió imagen.')
            await conn.sendFile(m.chat, url, 'waifu.jpg', item.label, m)
            return
        }

        if (item.type === 'api') {
            if (!item.api) return m.reply('❌ API no configurada.')
            const res = await httpRequest(item.api)
            const contentType = res.headers.get('content-type') || ''
            if (contentType.startsWith('image/')) {
                const buffer = Buffer.from(await res.arrayBuffer())
                await conn.sendFile(m.chat, buffer, 'img.jpg', item.label, m)
                return
            }
            const json = await res.json() as UrlResponse
            const value = item.field ? json[item.field] : json.url || json.message
            const url = typeof value === 'string' ? value : null
            if (!url) return m.reply('❌ La API no devolvió una URL válida.')
            await conn.sendFile(m.chat, url, 'nsfw.jpg', item.label, m)
            return
        }
        m.reply('❌ Fuente NSFW no soportada.')
    } catch (e: unknown) {
        logError('[NSFW ERROR]', e)
        m.reply('❌ Error al enviar imagen/video +18.')
    }
    }
})
