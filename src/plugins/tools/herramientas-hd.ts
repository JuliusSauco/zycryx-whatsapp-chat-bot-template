import {logError} from '../../lib/logger.js';
import uploadImage from '../../lib/uploadImage.js'
import {defineSdkPlugin, errorMessage} from '../../core/sdk-plugin.js'

interface ReminiResponse {
    status?: boolean;
    data?: {
        url?: string;
    };
}

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
        if (!info.neoxr.key) return sdk.reply.failure(sdk.content.message('tools.hd.missingConfig'))
        let json = await sdk.http.json<ReminiResponse>(`${info.neoxr.url}/remini?image=${encodeURIComponent(url)}&apikey=${info.neoxr.key}`)
        if (!json.status || !json.data?.url) return sdk.reply.failure(sdk.content.message('tools.hd.enhanceFailed'))
        await sdk.sendFile(json.data.url, 'hd.jpg', sdk.content.message('tools.hd.caption'))
        await sdk.reply.react('✅')
    } catch (e: unknown) {
        logError(e)
        await sdk.reply.react('❌')
        return sdk.reply.failure(sdk.content.renderMessage('tools.hd.error', {error: errorMessage(e)}))
    }
    }
})
