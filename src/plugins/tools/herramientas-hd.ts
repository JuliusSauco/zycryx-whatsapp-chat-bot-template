import {logError} from '../../lib/logger.js';
import uploadImage from '../../lib/uploadImage.js'
import {defineSdkPlugin, errorMessage} from '../../core/sdk-plugin.js'
import {enhanceImage} from '../../providers/media-conversion/image-enhancement.provider.js'

export default defineSdkPlugin({
    help: ['hd', 'remini', 'enhance'],
    tags: ['tools'],
    command: ['hd', 'remini', 'enhance'],
    register: true,
    limit: 1,
    async execute(m, {sdk}) {
    try {
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || q.mediaType || ""
        if (!mime.startsWith('image')) return sdk.reply.userError(sdk.content.message('tools.hd.missingImage'))
        await sdk.reply.react('⌛')

        let img = await q.download?.()
        if (!img) return sdk.reply.failure(sdk.content.message('tools.hd.downloadFailed'))
        let url = await uploadImage(img)
        const enhancedUrl = await enhanceImage(url)
        if (!enhancedUrl) return sdk.reply.failure(sdk.content.message('tools.hd.enhanceFailed'))
        await sdk.sendFile(enhancedUrl, 'hd.jpg', sdk.content.message('tools.hd.caption'))
        await sdk.reply.react('✅')
    } catch (e: unknown) {
        logError(e)
        await sdk.reply.react('❌')
        return sdk.reply.failure(sdk.content.renderMessage('tools.hd.error', {error: errorMessage(e)}))
    }
    }
})
