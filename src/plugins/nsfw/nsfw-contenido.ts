import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson, httpRequest} from '../../lib/http-client.js'
import {loadStringArrayResource} from '../../lib/local-json-resource.js'
import {buildAliasMap, buildAliasRegex} from '../../utils/command-alias.js'
import {pickRandom} from '../../utils/random.js'
import {nsfwContent, type NsfwContentItem} from './nsfw-contenido.data.js'
import {getRequiredPluginMessage} from '../../lib/message-template.js'


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
        if (!item) return m.reply(getRequiredPluginMessage('nsfw.content.unknownCommand'))

        if (item.type === 'array') {
            if (!item.array?.length) return m.reply(getRequiredPluginMessage('nsfw.content.emptySource'))
            const url = pickRandom(item.array)
            await conn.sendFile(m.chat, url, 'nsfw.jpg', item.label, m)
            return
        }

        if (item.type === 'json') {
            if (!item.dataFile) return m.reply(getRequiredPluginMessage('nsfw.content.missingJsonSource'))
            const data = await loadStringArrayResource(item.dataFile)
            const img = pickRandom(data)
            await conn.sendFile(m.chat, img, 'nsfw.jpg', item.label, m)
            return
        }

        if (item.type === 'waifu') {
            if (!item.api) return m.reply(getRequiredPluginMessage('nsfw.content.missingApi'))
            const {url} = await httpJson<UrlResponse>(`https://api.waifu.pics/nsfw/${item.api}`)
            if (!url) return m.reply(getRequiredPluginMessage('nsfw.content.missingImage'))
            await conn.sendFile(m.chat, url, 'waifu.jpg', item.label, m)
            return
        }

        if (item.type === 'api') {
            if (!item.api) return m.reply(getRequiredPluginMessage('nsfw.content.missingApi'))
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
            if (!url) return m.reply(getRequiredPluginMessage('nsfw.content.missingUrl'))
            await conn.sendFile(m.chat, url, 'nsfw.jpg', item.label, m)
            return
        }
        m.reply(getRequiredPluginMessage('nsfw.content.unsupportedSource'))
    } catch (e: unknown) {
        logError('[NSFW ERROR]', e)
        m.reply(getRequiredPluginMessage('nsfw.content.sendError'))
    }
    }
})
