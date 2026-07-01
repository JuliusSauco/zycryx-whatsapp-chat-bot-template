import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {searchPinterest} from '../../providers/downloads/pinterest.provider.js';
import {renderDownloadFailure} from './download-error.js';

export default defineSdkPlugin({
    help: ['pinterest <keyword>'],
    tags: ['buscadores'],
    command: /^(pinterest)$/i,
    register: true,
    limit: 1,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.pinterest.missingQuery', {
        command: sdk.usedPrefix + sdk.command
    })
    await sdk.reply.react("⌛");
    try {
        const result = await searchPinterest(sdk.text);
        if (!result.data) return sdk.reply.text(renderDownloadFailure('pinterest', result.failures));
        const results = result.data;
        const medias = results.map(result => ({
            type: "image",
            data: {url: result.image},
        }));
        await sdk.conn.sendAlbumMessage(sdk.chatId, medias, sdk.content.renderMessage('downloads.pinterest.albumCaption', {query: sdk.text}), m);
        await sdk.reply.react("✅️");
    } catch (e: unknown) {
        await sdk.reply.text(e instanceof Error ? e.message : sdk.content.renderMessage('downloads.pinterest.noResults', {query: sdk.text}));
        await sdk.reply.react("❌️");
    }
    }
});
