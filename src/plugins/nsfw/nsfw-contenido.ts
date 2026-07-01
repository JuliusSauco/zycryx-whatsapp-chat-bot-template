import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {loadStringArrayResource} from '../../lib/local-json-resource.js'
import {buildAliasMap, buildAliasRegex} from '../../utils/command-alias.js'
import {pickRandom} from '../../utils/random.js'
import {nsfwContent, type NsfwContentItem} from './nsfw-contenido.data.js'


interface UrlResponse {
    url?: string;
    message?: string;
    [key: string]: unknown;
}


const aliasMap = buildAliasMap<NsfwContentItem>(nsfwContent)

export default defineSdkPlugin({
    help: Object.keys(aliasMap),
    tags: ['nsfw'],
    command: buildAliasRegex(aliasMap),
    limit: 2,
    register: true,
    async execute(m, {sdk}) {
    try {
        const item = aliasMap[sdk.command.toLowerCase()]
        if (!item) return sdk.reply.message('nsfw.content.unknownCommand')

        if (item.type === 'array') {
            if (!item.array?.length) return sdk.reply.message('nsfw.content.emptySource')
            const url = pickRandom(item.array)
            await sdk.sendFile(url, 'nsfw.jpg', item.label)
            return
        }

        if (item.type === 'json') {
            if (!item.dataFile) return sdk.reply.message('nsfw.content.missingJsonSource')
            const data = await loadStringArrayResource(item.dataFile)
            const img = pickRandom(data)
            await sdk.sendFile(img, 'nsfw.jpg', item.label)
            return
        }

        if (item.type === 'waifu') {
            if (!item.api) return sdk.reply.message('nsfw.content.missingApi')
            const {url} = await sdk.http.json<UrlResponse>(`https://api.waifu.pics/nsfw/${item.api}`)
            if (!url) return sdk.reply.message('nsfw.content.missingImage')
            await sdk.sendFile(url, 'waifu.jpg', item.label)
            return
        }

        if (item.type === 'api') {
            if (!item.api) return sdk.reply.message('nsfw.content.missingApi')
            const res = await sdk.http.request(item.api)
            const contentType = res.headers.get('content-type') || ''
            if (contentType.startsWith('image/')) {
                const buffer = Buffer.from(await res.arrayBuffer())
                await sdk.sendFile(buffer, 'img.jpg', item.label)
                return
            }
            const json = await res.json() as UrlResponse
            const value = item.field ? json[item.field] : json.url || json.message
            const url = typeof value === 'string' ? value : null
            if (!url) return sdk.reply.message('nsfw.content.missingUrl')
            await sdk.sendFile(url, 'nsfw.jpg', item.label)
            return
        }
        await sdk.reply.message('nsfw.content.unsupportedSource')
    } catch (e: unknown) {
        logError('[NSFW ERROR]', e)
        await sdk.reply.message('nsfw.content.sendError')
    }
    }
})
