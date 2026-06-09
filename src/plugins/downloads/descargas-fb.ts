import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import fg from 'api-dylux';
import {httpJson} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {runFirstProvider, type Provider} from '../../lib/provider-fallback.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';

interface FacebookMediaData {
    type: 'video' | 'image'
    url: string
    caption: string
}

interface AgatzFacebookResponse {
    data?: {
        hd?: string
        sd?: string
        thumbnail?: string
    }
}

interface FgmodsFacebookResponse {
    result?: Array<{
        hd?: string
        sd?: string
    }>
}

interface DeliusFacebookResponse {
    urls?: Array<{
        hd?: string
        sd?: string
    }>
}

interface DorratzFacebookResponse {
    result?: {
        hd?: string
        sd?: string
    }
}

const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['fb', 'facebook', 'fbdl'],
    tags: ['downloader'],
    command: /^(facebook|fb|facebookdl|fbdl|facebook2|fb2|facebookdl2|fbdl2|facebook3|fb3|facebookdl3|fbdl3|facebook4|fb4|facebookdl4|fbdl4|facebook5|fb5|facebookdl5|fbdl5)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, command, usedPrefix}) {
    const missingUrlMessage = renderTemplate(getRequiredPluginMessage('downloads.facebook.missingUrl'), {
        command: usedPrefix + command
    });
    if (!args[0]) return m.reply(missingUrlMessage)
    if (!args[0].match(/www.facebook.com|fb.watch/g)) return m.reply(missingUrlMessage)
    if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.facebook.locked'), {
        user: m.sender.split('@')[0]
    }), m)
    m.react(`⌛`);
    try {
        const downloadProviders: Array<Provider<FacebookMediaData>> = [{
            name: 'agatz-facebook',
            run: async () => {
            const data = await httpJson<AgatzFacebookResponse>(`https://api.agatz.xyz/api/facebook?url=${args[0]}`);
            const videoUrl = data.data?.hd || data.data?.sd;
            const imageUrl = data.data?.thumbnail;
            if (videoUrl && videoUrl.endsWith('.mp4')) {
                return {type: 'video', url: videoUrl, caption: getRequiredPluginMessage('downloads.facebook.videoCaption')};
            } else if (imageUrl && (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.png'))) {
                return {type: 'image', url: imageUrl, caption: getRequiredPluginMessage('downloads.facebook.imageCaption')};
            }
        },
        },
            {
                name: 'fgmods-facebook',
                run: async () => {
                const data = await httpJson<FgmodsFacebookResponse>(`${info.fgmods.url}/downloader/fbdl?url=${args[0]}&apikey=${info.fgmods.key}`);
                const downloadUrl = data.result?.[0]?.hd || data.result?.[0]?.sd;
                if (!downloadUrl) throw new Error('Respuesta inválida de Fgmods');
                return {type: 'video', url: downloadUrl, caption: getRequiredPluginMessage('downloads.facebook.videoCaption')};
            },
            },
            {
                name: 'main-facebook',
                run: async () => {
                const apiUrl = `${info.apis}/download/facebook?url=${args[0]}`;
                const delius = await httpJson<DeliusFacebookResponse>(apiUrl);
                const downloadUrl = delius.urls?.[0]?.hd || delius.urls?.[0]?.sd;
                if (!downloadUrl) throw new Error('Respuesta inválida de API principal');
                return {type: 'video', url: downloadUrl, caption: getRequiredPluginMessage('downloads.facebook.videoCaption')};
            },
            },
            {
                name: 'dorratz-facebook',
                run: async () => {
                const apiUrl = `https://api.dorratz.com/fbvideo?url=${encodeURIComponent(args[0])}`;
                const data = await httpJson<DorratzFacebookResponse>(apiUrl);
                const downloadUrl = data.result?.hd || data.result?.sd;
                if (!downloadUrl) throw new Error('Respuesta inválida de Dorratz');
                return {type: 'video', url: downloadUrl, caption: getRequiredPluginMessage('downloads.facebook.videoCaption')};
            },
            },
            {
                name: 'api-dylux-facebook',
                run: async () => {
                const ress = await fg.fbdl(args[0]);
                const urll = ress.data[0].url;
                return {
                    type: 'video',
                    url: urll,
                    caption: getRequiredPluginMessage('downloads.facebook.videoCaptionBold')
                };
            }
            }];

        const mediaData = await runFirstProvider(downloadProviders, 'No se pudo descargar el video o imagen desde ninguna API');
        const fileName = mediaData.type === 'video' ? 'video.mp4' : 'thumbnail.jpg';
        await conn.sendFile(m.chat, mediaData.url, fileName, mediaData.caption, m);
        m.react('✅');
    } catch (e: unknown) {
        m.react('❌');
        logInfo(e);
    } finally {
        userRequests.release(m.sender);
    }
    }
});



//handler.limit = 3;
