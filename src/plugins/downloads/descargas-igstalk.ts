import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js'
import {getInstagramStalkProfile, type InstagramStalkProfile} from '../../providers/downloads/instagram-stalk.provider.js';

export default defineSdkPlugin({
    help: ['igstalk'],
    tags: ['downloader'],
    command: ['igstalk', 'igsearch', 'instagramsearch'],
    register: true,
    limit: 4,
    alternativeCoins: 40,
    async execute(m, {sdk}) {
    if (!sdk.args[0]) return sdk.reply.message('downloads.instagramStalk.missingUsername', {
        command: sdk.usedPrefix + sdk.command
    })
    await sdk.reply.react("⌛");
    try {
        const result = await getInstagramStalkProfile(sdk.args[0]);
        if (!result.data) return sdk.reply.react("❌");
        await sdk.sendFile(result.data.profilePicture, 'insta_profile.jpg', renderInstagramProfile(sdk.content, result.data));
        await sdk.reply.react("✅");
    } catch (e: unknown) {
        await sdk.reply.react(`❌`)
        await sdk.reply.message('downloads.instagramStalk.error', {error: String(e)})
        logInfo(e)
    }
    }
})

function renderInstagramProfile(content: PluginContentSdk, profile: InstagramStalkProfile): string {
    return content.renderMessage('downloads.instagramStalk.profile', {
        username: profile.username,
        fullName: profile.fullName,
        bio: profile.biography,
        verified: profile.verified ? content.message('downloads.instagramStalk.yes') : content.message('downloads.instagramStalk.no'),
        private: profile.private ? content.message('downloads.instagramStalk.yes') : content.message('downloads.instagramStalk.no'),
        followers: profile.followers,
        following: profile.following,
        posts: profile.posts,
        url: profile.url
    });
}
