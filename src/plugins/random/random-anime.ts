import {logError} from '../../lib/logger.js';
import hispamemes from 'hispamemes'
import {getNsfwSettings} from '../../services/group-settings.service.js'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {loadStringArrayResource} from '../../lib/local-json-resource.js'
import {buildAliasMap, buildAliasRegex} from '../../utils/command-alias.js'
import {pickRandom} from '../../utils/random.js'
import {randomAnimeContent, type RandomContentItem} from './random-anime.data.js'
import {canUseNsfw} from '../../utils/nsfw-access.js'


interface WaifuPicsResponse {
    url?: string;
}


const aliasMap = buildAliasMap<RandomContentItem>(randomAnimeContent)

export default defineSdkPlugin({
    command: buildAliasRegex(aliasMap),
    help: Object.keys(aliasMap),
    tags: ['randow'],
    register: true,
    async execute(m, {sdk, isGroupCreator}) {
    try {
        const item = aliasMap[sdk.command.toLowerCase()]
        if (!item) return sdk.reply.message('random.anime.unknownCommand')

        if (item.isMeme) {
            const url = await hispamemes.meme();
            await sdk.sendFile(url, 'error.jpg', sdk.content.message('random.anime.memeCaption'));
            return
        }

        if (item.type === 'json') {
            if (!item.dataFile) return sdk.reply.message('random.anime.missingJsonSource')
            const imgs = await loadStringArrayResource(item.dataFile)
            const img = pickRandom(imgs)
            await sdk.sendMessage({image: {url: img}, caption: item.label})
            return
        }

        if (item.type === 'api') {
            if (!item.api) return sdk.reply.message('random.anime.missingApi')
            let apiPath = `https://api.waifu.pics/sfw/${item.api}`
            try {
                const isNSFW = canUseNsfw(await getNsfwSettings(sdk.chatId), {isAdmin: sdk.isAdmin, isOwner: sdk.isOwner, isGroupCreator})
                if (isNSFW && item.nsfwApi) {
                    apiPath = `https://api.waifu.pics/nsfw/${item.nsfwApi}`
                }
            } catch (err: unknown) {
                logError('❌ Error al verificar NSFW:', err)
            }
            const {url} = await sdk.http.json<WaifuPicsResponse>(apiPath)
            if (!url) return sdk.reply.message('random.anime.missingImage')
            await sdk.sendFile(url, 'error.jpg', item.label);
            return
        }

        if (item.type === 'video') {
            if (!item.vids?.length) return sdk.reply.message('random.anime.missingVideos')
            const vid = pickRandom(item.vids)
            await sdk.sendFile(vid, 'error.mp4', item.label);
            return
        }

        if (item.type === 'static') {
            if (!item.imgs?.length) return sdk.reply.message('random.anime.missingImages')
            const img = pickRandom(item.imgs)
            await sdk.sendMessage({
                image: {url: img},
                caption: item.label
            })
            return
        }

    } catch (e: unknown) {
        logError('[❌ ERROR IMG]', e)
        await sdk.reply.message('random.anime.sendError')
    }
    }
})
