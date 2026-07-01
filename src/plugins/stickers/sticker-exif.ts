import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {setStickerExif} from '../../services/sticker-settings.service.js';

export default defineSdkPlugin({
    help: ['exif <packname> | <author>'],
    tags: ['sticker'],
    command: ['exif'],
    register: true,
    async execute(m, {sdk}) {
    if (!sdk.args[0]) return sdk.reply.message('stickers.exif.usage', {command: sdk.usedPrefix + sdk.command})

    let text = sdk.args.join(' ').split('|');
    let packname = text[0].trim();
    let author = text[1] ? text[1].trim() : '';

    if (!packname) return sdk.reply.message('stickers.exif.missingPackname');
    if (packname.length > 600) return sdk.reply.message('stickers.exif.packnameTooLong');
    if (author && author.length > 650) return sdk.reply.message('stickers.exif.authorTooLong');

    await setStickerExif(sdk.sender, packname, author || null);
    await sdk.reply.message('stickers.exif.success', {
        packname,
        author: author || sdk.content.message('stickers.exif.none'),
    })
    }
});
