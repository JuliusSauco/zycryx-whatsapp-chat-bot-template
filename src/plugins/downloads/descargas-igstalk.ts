import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import fg from 'api-dylux'
import {httpJson} from '../../lib/http-client.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

interface InstagramStalkResponse {
    data?: {
        username?: string
        full_name?: string
        biography?: string
        verified?: boolean
        private?: boolean
        followers?: number
        following?: number
        posts?: number
        url?: string
        profile_picture?: string
    }
}

export default definePlugin({
    help: ['igstalk'],
    tags: ['downloader'],
    command: ['igstalk', 'igsearch', 'instagramsearch'],
    register: true,
    limit: 1,
    async execute(m, {conn, args, usedPrefix, command}) {
    if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.instagramStalk.missingUsername'), {
        command: usedPrefix + command
    }))
    m.react("⌛");
    try {
        const apiUrl = `${info.apis}/tools/igstalk?username=${encodeURIComponent(args[0])}`;
        const delius = await httpJson<InstagramStalkResponse>(apiUrl);
        if (!delius || !delius.data) return m.react("❌");
        const profile = delius.data;
        const txt = renderTemplate(getRequiredPluginMessage('downloads.instagramStalk.profile'), {
            username: profile.username,
            fullName: profile.full_name,
            bio: profile.biography,
            verified: profile.verified ? getRequiredPluginMessage('downloads.instagramStalk.yes') : getRequiredPluginMessage('downloads.instagramStalk.no'),
            private: profile.private ? getRequiredPluginMessage('downloads.instagramStalk.yes') : getRequiredPluginMessage('downloads.instagramStalk.no'),
            followers: profile.followers,
            following: profile.following,
            posts: profile.posts,
            url: profile.url
        });

        await conn.sendFile(m.chat, profile.profile_picture, 'insta_profile.jpg', txt, m);
        m.react("✅");
    } catch (e2) {
        try {
            let res = await fg.igStalk(args[0])
            let te = renderTemplate(getRequiredPluginMessage('downloads.instagramStalk.fallbackProfile'), {
                name: res.name,
                username: res.username,
                followers: res.followersH,
                following: res.followingH,
                bio: res.description,
                posts: res.postsH,
                usernameClean: res.username.replace(/^@/, '')
            })
            await conn.sendFile(m.chat, res.profilePic, 'igstalk.png', te, m)
            m.react("⌛");
        } catch (e: unknown) {
            await m.react(`❌`)
            m.reply(renderTemplate(getRequiredPluginMessage('downloads.instagramStalk.error'), {error: String(e)}))
            logInfo(e)
        }
    }
    }
})
