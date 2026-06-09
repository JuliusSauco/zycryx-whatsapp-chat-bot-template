import {logError} from '../../lib/logger.js';
import hispamemes from 'hispamemes'
import {getNsfwSettings} from '../../services/group-settings.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson} from '../../lib/http-client.js'
import {loadStringArrayResource} from '../../lib/local-json-resource.js'
import {buildAliasMap, buildAliasRegex} from '../../utils/command-alias.js'
import {pickRandom} from '../../utils/random.js'
import {randomAnimeContent, type RandomContentItem} from './random-anime.data.js'
import {getRequiredPluginMessage} from '../../lib/message-template.js'


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
        if (!item) return m.reply(getRequiredPluginMessage('random.anime.unknownCommand'))

        if (item.isMeme) {
            const url = await hispamemes.meme();
            conn.sendFile(m.chat, url, 'error.jpg', getRequiredPluginMessage('random.anime.memeCaption'), m);
            return
        }

        if (item.type === 'json') {
            if (!item.dataFile) return m.reply(getRequiredPluginMessage('random.anime.missingJsonSource'))
            const imgs = await loadStringArrayResource(item.dataFile)
            const img = pickRandom(imgs)
            await conn.sendMessage(m.chat, {image: {url: img}, caption: item.label}, {quoted: m})
            return
        }

        if (item.type === 'api') {
            if (!item.api) return m.reply(getRequiredPluginMessage('random.anime.missingApi'))
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
            if (!url) return m.reply(getRequiredPluginMessage('random.anime.missingImage'))
            await conn.sendFile(m.chat, url, 'error.jpg', item.label, m);
            return
        }

        if (item.type === 'video') {
            if (!item.vids?.length) return m.reply(getRequiredPluginMessage('random.anime.missingVideos'))
            const vid = pickRandom(item.vids)
            await conn.sendFile(m.chat, vid, 'error.mp4', item.label, m);
            return
        }

        if (item.type === 'static') {
            if (!item.imgs?.length) return m.reply(getRequiredPluginMessage('random.anime.missingImages'))
            const img = pickRandom(item.imgs)
            await conn.sendMessage(m.chat, {
                image: {url: img},
                caption: item.label
            }, {quoted: m})
            return
        }

    } catch (e: unknown) {
        logError('[❌ ERROR IMG]', e)
        m.reply(getRequiredPluginMessage('random.anime.sendError'))
    }
    }
})
