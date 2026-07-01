import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {generateAiImage} from '../../providers/ai/image.provider.js';

export default defineSdkPlugin({
    help: ["dalle"],
    tags: ["buscadores"],
    command: ['dall-e', 'dalle', 'ia2', 'cimg', 'openai3', 'a-img', 'aimg', 'imagine'],
    register: true,
    limit: 1,
    async execute(_m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('tools.imageAi.usage', {command: sdk.usedPrefix + sdk.command})
    await sdk.reply.react('⌛')
    try {
        const result = await generateAiImage(sdk.text, sdk.conn.getFile);
        if (!result.data) throw new Error(result.failures[0]?.error || 'Ninguna API funcional');
        const captionKey = result.data.kind === 'generated'
            ? 'tools.imageAi.generatedCaption'
            : 'tools.imageAi.resultCaption';
        await sdk.sendFile(result.data.url, 'error.jpg', sdk.content.renderMessage(captionKey, {query: sdk.text}));
        await sdk.reply.react('✅');
    } catch (error: unknown) {
        logInfo('[❗] Error, ninguna api funcional.\n' + error);
        await sdk.reply.message('tools.imageAi.error', {error: String(error)})
        await sdk.reply.react('❌')
    }
    }
});

