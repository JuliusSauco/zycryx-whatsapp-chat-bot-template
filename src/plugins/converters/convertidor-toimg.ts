import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {convertWebpToPng} from '../../providers/media-conversion/image.provider.js';

export default defineSdkPlugin({
    help: ['toimg (reply)'],
    tags: ['convertidor'],
    command: ['toimg', 'jpg', 'img'],
    register: true,
    async execute(m, {sdk}) {
    const notStickerMessage = sdk.content.renderMessage('converters.toImage.notSticker', {command: sdk.usedPrefix + sdk.command});
    if (!m.quoted) throw notStickerMessage;
    const q = m.quoted;
    const mime = q?.mimetype || '';
    if (!mime.includes('webp')) throw notStickerMessage;
    await sdk.reply.message('converters.toImage.processing');
    const media = await q.download();
    const out = await convertWebpToPng(media);
    await sdk.sendFile(out, 'sticker.png');
    }
});
