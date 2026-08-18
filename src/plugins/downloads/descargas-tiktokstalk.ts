import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js'
import {getTikTokStalkProfile, type TikTokStalkProfile} from '../../providers/downloads/tiktok-stalk.provider.js';

export default defineSdkPlugin({
    help: ['tiktokstalk'],
    tags: ['downloader'],
    command: /^t(tstalk|iktokstalk)$/i,
    register: true,
    limit: 4,
    alternativeCoins: 40,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.tiktokStalk.missingUsername')
    await sdk.reply.react("⌛");
    try {
        const result = await getTikTokStalkProfile(sdk.args[0]);
        if (!result.data) return sdk.reply.react("❌");
        await sdk.sendFile(result.data.avatar, 'tt.png', renderTikTokProfile(sdk.content, result.data));
        await sdk.reply.react("✅");
    } catch (e: unknown) {
        await sdk.reply.react(`❌`)
        await sdk.reply.message('downloads.tiktokStalk.error', {error: String(e)})
        logInfo(e)
    }
    }
})

function renderTikTokProfile(content: PluginContentSdk, profile: TikTokStalkProfile): string {
    return content.renderMessage('downloads.tiktokStalk.profile', {
        username: profile.username,
        nickname: profile.nickname,
        verified: profile.verified ? content.message('downloads.tiktokStalk.yes') : content.message('downloads.tiktokStalk.no'),
        followers: profile.followers.toLocaleString(),
        following: profile.following.toLocaleString(),
        likes: profile.likes.toLocaleString(),
        videos: profile.videos.toLocaleString(),
        signature: profile.signature,
        url: profile.url
    });
}
