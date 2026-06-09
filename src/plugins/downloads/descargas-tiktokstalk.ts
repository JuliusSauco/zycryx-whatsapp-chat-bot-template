import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import fg from 'api-dylux'
import {httpJson} from '../../lib/http-client.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

interface TikTokStalkResponse {
    result?: {
        users?: {
            username?: string
            nickname?: string
            verified?: boolean
            signature?: string
            url?: string
            avatarLarger?: string
        }
        stats?: {
            followerCount?: number
            followingCount?: number
            heartCount?: number
            videoCount?: number
        }
    }
}

export default definePlugin({
    help: ['tiktokstalk'],
    tags: ['downloader'],
    command: /^t(tstalk|iktokstalk)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, args}) {
    if (!text) return m.reply(getRequiredPluginMessage('downloads.tiktokStalk.missingUsername'))
    m.react("⌛");
    try {
        const apiUrl = `${info.apis}/tools/tiktokstalk?q=${encodeURIComponent(args[0])}`;
        const delius = await httpJson<TikTokStalkResponse>(apiUrl);
        if (!delius || !delius.result || !delius.result.users) return m.react("❌");
        const profile = delius.result.users;
        const stats = delius.result.stats || {};
        const txt = renderTemplate(getRequiredPluginMessage('downloads.tiktokStalk.profile'), {
            username: profile.username,
            nickname: profile.nickname,
            verified: profile.verified ? getRequiredPluginMessage('downloads.tiktokStalk.yes') : getRequiredPluginMessage('downloads.tiktokStalk.no'),
            followers: (stats.followerCount || 0).toLocaleString(),
            following: (stats.followingCount || 0).toLocaleString(),
            likes: (stats.heartCount || 0).toLocaleString(),
            videos: (stats.videoCount || 0).toLocaleString(),
            signature: profile.signature,
            url: profile.url
        });

        await conn.sendFile(m.chat, profile.avatarLarger, 'tt.png', txt, m);
        m.react("✅");
    } catch (e2) {
        try {
            let res = await fg.ttStalk(args[0])
            let txt = renderTemplate(getRequiredPluginMessage('downloads.tiktokStalk.fallbackProfile'), {
                name: res.name,
                username: res.username,
                followers: res.followers,
                following: res.following,
                description: res.desc
            })
            await conn.sendFile(m.chat, res.profile, 'tt.png', txt, m)
            m.react("✅");
        } catch (e: unknown) {
            await m.react(`❌`)
            m.reply(renderTemplate(getRequiredPluginMessage('downloads.tiktokStalk.error'), {error: String(e)}))
            logInfo(e)
        }
    }
    }
})
