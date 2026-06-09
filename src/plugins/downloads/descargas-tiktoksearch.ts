import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {randomInt} from '../../utils/random.js';

interface TikTokSearchItem {
    hd?: string
}

interface TikTokSearchResponse {
    meta?: TikTokSearchItem[]
}

const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['tiktoksearch <texto>'],
    tags: ['downloader'],
    command: ['tiktoksearch', 'ttsearch'],
    register: true,
    limit: 4,
    async execute(m, {conn, usedPrefix, command, text}) {
    if (!text) throw renderTemplate(getRequiredPluginMessage('downloads.tiktokSearch.missingQuery'), {
        command: usedPrefix + command
    })
    if (!userRequests.acquire(m.sender)) return m.reply(getRequiredPluginMessage('downloads.tiktokSearch.locked'))
    m.react("⏳")
    try {
        const response = await httpJson<TikTokSearchResponse>(`${info.apis}/search/tiktoksearch?query=${text}`);
        if (!response || !response.meta || !Array.isArray(response.meta) || response.meta.length === 0) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.tiktokSearch.noResults'), {query: text}));
        let searchResults = response.meta;
        shuffleArray(searchResults);
        let selectedResults = searchResults.slice(0, 5);
        const medias = selectedResults.map(result => ({type: "video", data: {url: result.hd}}));
        await conn.sendAlbumMessage(m.chat, medias, renderTemplate(getRequiredPluginMessage('downloads.tiktokSearch.albumCaption'), {query: text}), m);
        m.react("✅️");
    } catch (error: unknown) {
        m.react("❌️")
        logError(error);
    } finally {
        userRequests.release(m.sender);
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
