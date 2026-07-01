import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {listUploadServiceNames, uploadMedia} from '../../providers/media-conversion/upload.provider.js';

export default defineSdkPlugin({
    help: ['tourl <opcional servicio>'],
    tags: ['convertidor'],
    command: /^(upload|tourl)$/i,
    register: true,
    async execute(m, {sdk}) {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!mime) throw sdk.content.renderMessage('converters.toUrl.missingMedia', {command: sdk.usedPrefix + sdk.command});

    const media = await q.download();
    if (!media) throw sdk.content.message('converters.toUrl.downloadError');
    const option = (sdk.args[0] || "").toLowerCase();
    try {
        const link = await uploadMedia(media, mime, option);
        return sdk.reply.text(link);
    } catch (e: unknown) {
        logError(e);
        throw sdk.content.renderMessage('converters.toUrl.uploadError', {
            services: listUploadServiceNames().map((value) => `➔ ${sdk.usedPrefix}${sdk.command} ${value}`).join('\n'),
        });
    }
    }
});
