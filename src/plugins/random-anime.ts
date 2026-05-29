import fetch from 'node-fetch'
import axios from 'axios'
import hispamemes from 'hispamemes'
import {getNsfwSettings} from '../services/group-settings.service.js'
import {definePlugin} from '../core/define-plugin.js'

const contenido = {
    waifu: {label: '*💖 Nyaww 💖*', api: 'waifu', nsfwApi: 'waifu', type: 'api', aliases: []},
    neko: {label: '🐱 Neko', api: 'neko', nsfwApi: 'neko', type: 'api', aliases: ['gatito', 'nyan']},
    shinobu: {label: '🍡 Shinobu', api: 'shinobu', type: 'api', aliases: []},
    megumin: {label: '💥 Megumin', api: 'megumin', type: 'api', aliases: ['meg']},
    bully: {label: '😈 Bully', api: 'bully', type: 'api', aliases: []},
    cuddle: {label: '🥰 Cuddle', api: 'cuddle', type: 'api', aliases: []},
    cry: {label: '😭 Cry', api: 'cry', type: 'api', aliases: []},
    bonk: {label: '🔨 Bonk', api: 'bonk', type: 'api', aliases: []},
    wink: {label: '😉 Wink', api: 'wink', type: 'api', aliases: []},
    handhold: {label: '🤝 Handhold', api: 'handhold', type: 'api', aliases: []},
    nom: {label: '🍪 Nom', api: 'nom', type: 'api', aliases: []},
    glomp: {label: '💞 Glomp', api: 'glomp', type: 'api', aliases: []},
    happy: {label: '😁 Happy', api: 'happy', type: 'api', aliases: []},
    poke: {label: '👉 Poke', api: 'poke', type: 'api', aliases: []},
    dance: {label: '💃 Dance', api: 'dance', type: 'api', aliases: []},
    meme: {label: '🤣 Meme', isMeme: true, aliases: ['memes', 'meme2']},
    loli: {
        label: '*Yo soy tu loli uwu 😍*',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/loli.json',
        aliases: ['kawaii']
    },
    navidad: {
        label: '🎄 Navidad',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/navidad.json',
        aliases: []
    },
    messi: {
        label: '*🇦🇷 Messi*',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/messi.json',
        aliases: []
    },
    ronaldo: {
        label: '_*Siiiuuuuuu*_',
        type: 'json',
        url: 'https://raw.githubusercontent.com/elrebelde21/The-LoliBot-MD2/main/src/randow/CristianoRonaldo.json',
        aliases: []
    }
}

const aliasMap = {}
for (const [key, item] of Object.entries(contenido)) {
    // @ts-ignore
    aliasMap[key.toLowerCase()] = item
    for (const alias of (item.aliases || [])) {
        // @ts-ignore
        aliasMap[alias.toLowerCase()] = item
    }
}

export default definePlugin({
    command: new RegExp(`^(${Object.keys(aliasMap).join('|')})$`, 'i'),
    help: Object.keys(aliasMap),
    tags: ['randow'],
    register: true,
    async execute(m, {conn, command}) {
    try {
        // @ts-ignore
        const item = aliasMap[command.toLowerCase()]
        if (!item) return m.reply('❌ Comando no reconocido.')

        if (item.isMeme) {
            const url = await hispamemes.meme();
            conn.sendFile(m.chat, url, 'error.jpg', `😂🤣🤣`, m);
            return
        }

        if (item.type === 'json') {
            const res = await axios.get(item.url)
            const imgs = res.data
            const img = imgs[Math.floor(Math.random() * imgs.length)]
            await conn.sendMessage(m.chat, {image: {url: img}, caption: item.label}, {quoted: m})
            return
        }

        if (item.type === 'api') {
            let apiPath = `https://api.waifu.pics/sfw/${item.api}`
            try {
                const {modohorny} = await getNsfwSettings(m.chat)
                const isNSFW = modohorny === true
                if (isNSFW && item.nsfwApi) {
                    apiPath = `https://api.waifu.pics/nsfw/${item.nsfwApi}`
                }
            } catch (err: any) {
                console.error('❌ Error al verificar NSFW:', err)
            }
            const res = await fetch(apiPath)
            const {url} = await res.json() as any
            await conn.sendFile(m.chat, url, 'error.jpg', item.label, m);
            return
        }

        if (item.type === 'video') {
            const vid = item.vids[Math.floor(Math.random() * item.vids.length)]
            await conn.sendFile(m.chat, vid, 'error.mp4', item.label, m);
            return
        }

        if (item.type === 'static') {
            const img = item.imgs[Math.floor(Math.random() * item.imgs.length)]
            await conn.sendMessage(m.chat, {
                image: {url: img},
                caption: item.label
            }, {quoted: m})
            return
        }

    } catch (e: any) {
        console.error('[❌ ERROR IMG]', e)
        m.reply('❌ Error al enviar imagen.')
    }
    }
})
