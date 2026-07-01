import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {searchTikTokVideos} from '../../providers/downloads/tiktok.provider.js';
import {randomInt} from '../../utils/random.js';

const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['tiktoksearch <texto>'],
    tags: ['downloader'],
    command: ['tiktoksearch', 'ttsearch'],
    register: true,
    limit: 4,
    async execute(m, {sdk}) {
    if (!sdk.text) throw sdk.content.renderMessage('downloads.tiktokSearch.missingQuery', {
        command: sdk.usedPrefix + sdk.command
    })
    if (!userRequests.acquire(sdk.sender)) return sdk.reply.message('downloads.tiktokSearch.locked')
    await sdk.reply.react("⏳")
    try {
        const searchResults = await searchTikTokVideos(sdk.text);
        if (searchResults.length === 0) return sdk.reply.message('downloads.tiktokSearch.noResults', {query: sdk.text});
        shuffleArray(searchResults);
        const selectedResults = searchResults.slice(0, 5);
        const medias = selectedResults.map(result => ({type: "video", data: {url: result.url}}));
        await sdk.conn.sendAlbumMessage(sdk.chatId, medias, sdk.content.renderMessage('downloads.tiktokSearch.albumCaption', {query: sdk.text}), m);
        await sdk.reply.react("✅️");
    } catch (error: unknown) {
        await sdk.reply.react("❌️")
        logError(error);
    } finally {
        userRequests.release(sdk.sender);
    }
    }
});

;

function shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
}
