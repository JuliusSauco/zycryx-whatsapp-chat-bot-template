import axios from 'axios'
import fetch from 'node-fetch'
import {definePlugin} from '../../core/define-plugin.js'

interface NsfwContentItem {
    label: string;
    type: 'json' | 'api' | 'waifu' | 'array';
    aliases: string[];
    url?: string;
    api?: string;
    field?: string;
    array?: string[];
}

interface UrlResponse {
    url?: string;
    message?: string;
    [key: string]: unknown;
}

const contenidoNSFW = {
    pack: {
        label: '_🥵 aqui tiene mi Pack 😏_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/pack.json',
        aliases: []
    },
    pack2: {
        label: '_🥵 aqui tiene mi Pack 😏_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/packgirl.json',
        aliases: []
    },
    pack3: {
        label: '_🥵 aqui tiene mi Pack 😏_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/packmen.json',
        aliases: []
    },
    tetas: {
        label: '🥵 dame lechita de hay 🥵',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/tetas.json',
        aliases: ['pechos']
    },
    videoxxx: {
        label: '_*ᴅɪsғʀᴜᴛᴀ ᴅᴇʟ ᴠɪᴅᴇᴏ 🥵_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/videoxxxc.json',
        aliases: ['vídeoxxx']
    },
    videoxxxlesbi: {
        label: '_*ᴅɪsғʀᴜᴛᴀ ᴅᴇʟ ᴠɪᴅᴇᴏ 🥵_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/videoxxxc2.json',
        aliases: ['videolesbixxx', 'pornolesbivid']
    },
    pornololi: {
        label: '🥵',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/nsfw/pornololi.json',
        aliases: ['pornololi']
    },
    yuri: {
        label: '👩‍❤️‍👩 Yuri',
        type: 'json',
        url: 'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/yuri.json',
        aliases: []
    },
    yaoi: {
        label: '👨‍❤️‍👨 Yaoi',
        type: 'api',
        api: 'https://nekobot.xyz/api/image?type=yaoi',
        field: 'message',
        aliases: []
    },
    corean: {label: '🥵', type: 'api', api: 'https://delirius-apiofc.vercel.app/nsfw/corean', aliases: ["china"]},
    boobs: {label: 'Upa la paja 😱', type: 'api', api: 'https://delirius-apiofc.vercel.app/nsfw/boobs', aliases: []},
    girls: {
        label: '🥵 Uff pa una pajita 🥵',
        type: 'api',
        api: 'https://delirius-apiofc.vercel.app/nsfw/girls',
        aliases: ["porno"]
    },
    trapito: {label: '🚺 Trapito', type: 'waifu', api: 'trap', aliases: ['trap']},
} satisfies Record<string, NsfwContentItem>

const aliasMap: Record<string, NsfwContentItem> = {}
for (const [key, item] of Object.entries(contenidoNSFW)) {
    aliasMap[key.toLowerCase()] = item
    for (const alias of (item.aliases || [])) {
        aliasMap[alias.toLowerCase()] = item
    }
}

export default definePlugin({
    help: Object.keys(aliasMap),
    tags: ['nsfw'],
    command: new RegExp(`^(${Object.keys(aliasMap).join('|')})$`, 'i'),
    limit: 2,
    register: true,
    async execute(m, {conn, command}) {
    try {
        const item = aliasMap[command.toLowerCase()]
        if (!item) return m.reply('❌ Comando NSFW no reconocido.')

        if (item.type === 'array') {
            if (!item.array?.length) return m.reply('❌ Fuente NSFW vacía.')
            const url = item.array[Math.floor(Math.random() * item.array.length)]
            await conn.sendFile(m.chat, url, 'nsfw.jpg', item.label, m)
            return
        }

        if (item.type === 'json') {
            if (!item.url) return m.reply('❌ Fuente JSON no configurada.')
            const {data} = await axios.get<string[]>(item.url)
            const img = data[Math.floor(Math.random() * data.length)]
            await conn.sendFile(m.chat, img, 'nsfw.jpg', item.label, m)
            return
        }

        if (item.type === 'waifu') {
            if (!item.api) return m.reply('❌ API no configurada.')
            const res = await fetch(`https://api.waifu.pics/nsfw/${item.api}`)
            const {url} = await res.json() as UrlResponse
            if (!url) return m.reply('❌ La API no devolvió imagen.')
            await conn.sendFile(m.chat, url, 'waifu.jpg', item.label, m)
            return
        }

        if (item.type === 'api') {
            if (!item.api) return m.reply('❌ API no configurada.')
            const res = await fetch(item.api)
            const contentType = res.headers.get('content-type') || ''
            if (contentType.startsWith('image/')) {
                const buffer = await res.buffer()
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
        console.error('[NSFW ERROR]', e)
        m.reply('❌ Error al enviar imagen/video +18.')
    }
    }
})
