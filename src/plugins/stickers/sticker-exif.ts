import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {setStickerExif} from '../../services/sticker-settings.service.js';

export default definePlugin({
    help: ['exif <packname> | <author>'],
    tags: ['sticker'],
    command: ['exif'],
    register: true,
    async execute(m, {args, usedPrefix, command}) {
    if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('stickers.exif.usage'), {command: usedPrefix + command}))

    let text = args.join(' ').split('|');
    let packname = text[0].trim();
    let author = text[1] ? text[1].trim() : '';

    if (!packname) return m.reply(getRequiredPluginMessage('stickers.exif.missingPackname'));
    if (packname.length > 600) return m.reply(getRequiredPluginMessage('stickers.exif.packnameTooLong'));
    if (author && author.length > 650) return m.reply(getRequiredPluginMessage('stickers.exif.authorTooLong'));

    await setStickerExif(m.sender, packname, author || null);
    await m.reply(renderTemplate(getRequiredPluginMessage('stickers.exif.success'), {
        packname,
        author: author || getRequiredPluginMessage('stickers.exif.none'),
    }))
    }
});
