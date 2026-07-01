import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {convertMediaToMp3} from '../../providers/media-conversion/audio.provider.js';

export default defineSdkPlugin({
    help: ['tomp3'],
    tags: ['convertidor'],
    command: /^to(mp3|audio)$/i,
    register: true,
    async execute(m, {sdk}) {
    const q = m.quoted ? m.quoted : m;
    const mime = q.mimetype || q.msg?.mimetype || q.mediaType || '';
    if (!/video|audio/.test(mime)) throw sdk.content.message('converters.toMp3.missingMedia');
    const media = await q.download();
    if (!media) throw sdk.content.message('converters.toMp3.downloadError');
    await sdk.reply.message('converters.toMp3.processing');
    const audio = await convertMediaToMp3(media);
    if (!audio) throw sdk.content.message('converters.toMp3.conversionError');
    await sdk.sendMessage({audio, mimetype: 'audio/mpeg'});
    }
});
