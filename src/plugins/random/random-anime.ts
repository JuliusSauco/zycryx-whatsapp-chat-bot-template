import {logError} from '../../lib/logger.js';
import hispamemes from 'hispamemes'
import {getNsfwSettings} from '../../services/group-settings.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson} from '../../lib/http-client.js'
import {loadStringArrayResource} from '../../lib/local-json-resource.js'
import {buildAliasMap, buildAliasRegex} from '../../utils/command-alias.js'
import {pickRandom} from '../../utils/random.js'
import {randomAnimeContent, type RandomContentItem} from './random-anime.data.js'


interface WaifuPicsResponse {
    url?: string;
}


const aliasMap = buildAliasMap<RandomContentItem>(randomAnimeContent)

export default definePlugin({
    command: buildAliasRegex(aliasMap),
    help: Object.keys(aliasMap),
    tags: ['randow'],
    register: true,
    async execute(m, {conn, command}) {
    try {
        const item = aliasMap[command.toLowerCase()]
        if (!item) return m.reply('❌ Comando no reconocido.')

        if (item.isMeme) {
            const url = await hispamemes.meme();
            conn.sendFile(m.chat, url, 'error.jpg', `😂🤣🤣`, m);
            return
        }

        if (item.type === 'json') {
            if (!item.dataFile) return m.reply('❌ Fuente JSON no configurada.')
            const imgs = await loadStringArrayResource(item.dataFile)
            const img = pickRandom(imgs)
            await conn.sendMessage(m.chat, {image: {url: img}, caption: item.label}, {quoted: m})
            return
        }

        if (item.type === 'api') {
            if (!item.api) return m.reply('❌ API no configurada.')
            let apiPath = `https://api.waifu.pics/sfw/${item.api}`
            try {
                const {modohorny} = await getNsfwSettings(m.chat)
                const isNSFW = modohorny === true
                if (isNSFW && item.nsfwApi) {
                    apiPath = `https://api.waifu.pics/nsfw/${item.nsfwApi}`
                }
            } catch (err: unknown) {
                logError('❌ Error al verificar NSFW:', err)
            }
            const {url} = await httpJson<WaifuPicsResponse>(apiPath)
            if (!url) return m.reply('❌ La API no devolvió imagen.')
            await conn.sendFile(m.chat, url, 'error.jpg', item.label, m);
            return
        }

        if (item.type === 'video') {
            if (!item.vids?.length) return m.reply('❌ No hay videos configurados.')
            const vid = pickRandom(item.vids)
            await conn.sendFile(m.chat, vid, 'error.mp4', item.label, m);
            return
        }

        if (item.type === 'static') {
            if (!item.imgs?.length) return m.reply('❌ No hay imágenes configuradas.')
            const img = pickRandom(item.imgs)
            await conn.sendMessage(m.chat, {
                image: {url: img},
                caption: item.label
            }, {quoted: m})
            return
        }

    } catch (e: unknown) {
        logError('[❌ ERROR IMG]', e)
        m.reply('❌ Error al enviar imagen.')
    }
    }
})
