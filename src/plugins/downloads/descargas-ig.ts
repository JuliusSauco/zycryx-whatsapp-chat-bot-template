import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {instagramdl} from '@bochilteam/scraper';
import {httpJson, httpText} from '../../lib/http-client.js';
import {runFirstProvider, type Provider} from '../../lib/provider-fallback.js';

interface InstagramMediaData {
    url: string
    type: string
    caption: string
}

interface InstagramArrayResponse {
    data?: Array<{
        url?: string
        type?: string
    }>
}

interface FgmodsInstagramResponse {
    result?: Array<{
        url?: string
    }>
}

const userRequests: Record<string, boolean> = {};

export default definePlugin({
    help: ['instagram *<link ig>*'],
    tags: ['downloader'],
    command: /^(instagramdl|instagram|igdl|ig|instagramdl2|instagram2|igdl2|ig2|instagramdl3|instagram3|igdl3|ig3)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, args, command, usedPrefix}) {
    if (!args[0]) return m.reply(`⚠️ Ingresa el enlace del vídeo de Instagram junto al comando.\n\nEjemplo: *${usedPrefix + command}* https://www.instagram.com/p/C60xXk3J-sb/?igsh=YzljYTk1ODg3Zg==`)
    if (userRequests[m.sender]) return await conn.reply(m.chat, `Oye @${m.sender.split('@')[0]}, calma, ya estás descargando algo 😒\nEspera a que termine tu solicitud actual antes de hacer otra...`, m)
    userRequests[m.sender] = true;
    await m.react('⌛');
    try {
        const downloadProviders: Array<Provider<InstagramMediaData>> = [
            {
                name: 'siputz-instagram',
                run: async () => {
                const data = await httpJson<InstagramArrayResponse>(`https://api.siputzx.my.id/api/d/igdl?url=${args[0]}`);
                const media = data.data?.[0];
                if (!media?.url) throw new Error('Respuesta inválida de Siputz');
                const fileType = media.url.includes('.webp') ? 'image' : 'video';
                return {
                    url: media.url,
                    type: fileType,
                    caption: fileType === 'image' ? '_*Aqui tiene tu imagen de Instagram*_' : '*Aqui esta el video de Instagram*',
                }
            },
            },
            {
                name: 'fgmods-instagram',
                run: async () => {
                const data = await httpJson<FgmodsInstagramResponse>(`${info.fgmods.url}/downloader/igdl?url=${args[0]}&apikey=${info.fgmods.key}`);
                const result = data.result?.[0];
                if (!result?.url) throw new Error('Respuesta inválida de Fgmods');
                const fileType = result.url.endsWith('.jpg') || result.url.endsWith('.png') ? 'image' : 'video';
                return {
                    url: result.url,
                    type: fileType,
                    caption: fileType === 'image' ? '_*Aqui tiene tu imagen de Instagram*_' : '*Aqui esta el video de Instagram*',
                }
            },
            },
            {
                name: 'main-instagram',
                run: async () => {
                const apiUrl = `${info.apis}/download/instagram?url=${encodeURIComponent(args[0])}`;
                const delius = await httpJson<InstagramArrayResponse>(apiUrl);
                const media = delius.data?.[0];
                if (!media?.url || !media.type) throw new Error('Respuesta inválida de API principal');
                return {
                    url: media.url,
                    type: media.type,
                    caption: media.type === 'image' ? '_*Aqui tiene tu imagen de Instagram*_' : '*Aqui esta el video de Instagram*',
                }
            },
            },
            {
                name: 'bochil-instagram',
                run: async () => {
                const resultssss = await instagramdl(args[0]);
                const shortUrl3 = await httpText(`https://tinyurl.com/api-create.php?url=${args[0]}`);
                const txt4 = `_${shortUrl3}_`.trim();
                return {
                    url: resultssss[0].url,
                    type: resultssss[0].url.endsWith('.mp4') ? 'video' : 'image',
                    caption: txt4
                };
            },
            },
        ];

        const fileData = await runFirstProvider(downloadProviders, 'No se pudo descargar el archivo desde ninguna API');
        const fileName = fileData.type === 'image' ? 'ig.jpg' : 'ig.mp4';
        await conn.sendFile(m.chat, fileData.url, fileName, fileData.caption, m);
        await m.react('✅');
    } catch (e: unknown) {
        await m.react('❌');
        logInfo(e);
    } finally {
        delete userRequests[m.sender];
    }
    }
});

;

