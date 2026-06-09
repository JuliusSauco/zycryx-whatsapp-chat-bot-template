import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {httpJson} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {runFirstProvider, type Provider} from '../../lib/provider-fallback.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
interface MediafireFileData {
    url: string
    filename: string
    filesize?: string
    mimetype?: string
}

interface MediafireArrayResponse {
    data?: Array<{
        link?: string
        filename?: string
        nama?: string
        size?: string
        mime?: string
    }>
}

interface NeoxrMediafireResponse {
    status?: boolean
    data?: {
        url?: string
        title?: string
        size?: string
        mime?: string
    }
}

const userCaptions = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['mediafire', 'mediafiredl'],
    tags: ['downloader'],
    command: /^(mediafire|mediafiredl|dlmediafire)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, usedPrefix, command}) {
    const sticker = 'https://qu.ax/Wdsb.webp';
    if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.mediafire.missingUrl'), {
        command: usedPrefix + command
    }))

    if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.mediafire.locked'), {
        user: m.sender.split('@')[0]
    }), userCaptions.get(m.sender) || m);
    m.react(`🚀`);
    try {
        const downloadProviders: Array<Provider<MediafireFileData>> = [
            {
                name: 'delirius-mediafire',
                run: async () => {
                const data = await httpJson<MediafireArrayResponse>(`https://api.delirius.store/download/mediafire?url=${args[0]}`);
                const file = data.data?.[0];
                if (!file?.link || !file.filename) throw new Error('Respuesta inválida de Delirius');
                return {
                    url: file.link,
                    filename: file.filename,
                    filesize: file.size,
                    mimetype: file.mime
                }
            },
            },
            {
                name: 'neoxr-mediafire',
                run: async () => {
                const data = await httpJson<NeoxrMediafireResponse>(`${info.neoxr.url}/mediafire?url=${args[0]}&apikey=${info.neoxr.key}`);
                if (!data.status || !data.data) throw new Error('Error en Neoxr');
                if (!data.data.url || !data.data.title) throw new Error('Respuesta inválida de Neoxr');
                return {
                    url: data.data.url,
                    filename: data.data.title,
                    filesize: data.data.size,
                    mimetype: data.data.mime
                }
            },
            },
            {
                name: 'agatz-mediafire',
                run: async () => {
                const data = await httpJson<MediafireArrayResponse>(`https://api.agatz.xyz/api/mediafire?url=${args[0]}`);
                const file = data.data?.[0];
                if (!file?.link || !file.nama) throw new Error('Respuesta inválida de Agatz');
                return {
                    url: file.link,
                    filename: file.nama,
                    filesize: file.size,
                    mimetype: file.mime
                }
            },
            },
            {
                name: 'siputz-mediafire',
                run: async () => {
                const data = await httpJson<MediafireArrayResponse>(`https://api.siputzx.my.id/api/d/mediafire?url=${args[0]}`);
                const file = data.data?.[0];
                if (!file?.link || !file.filename) throw new Error('Respuesta inválida de Siputz');
                return {
                    url: file.link,
                    filename: file.filename,
                    filesize: file.size,
                    mimetype: file.mime
                };
            }
            },
        ];

        const file = await runFirstProvider(downloadProviders, 'No se pudo descargar el archivo desde ninguna API');
        const caption = renderTemplate(getRequiredPluginMessage('downloads.mediafire.caption'), {
            filename: file.filename,
            filesize: file.filesize,
            mimetype: file.mimetype,
            version: info.vs
        }).trim();
        const captionMessage = await conn.reply(m.chat, caption, m)
        userCaptions.set(m.sender, captionMessage);
        await conn.sendFile(m.chat, file.url, file.filename, '', m, undefined, {mimetype: file.mimetype, asDocument: true});
        m.react('✅');
    } catch (e: unknown) {
        await conn.sendFile(m.chat, sticker, 'error.webp', '', m);
        m.react('❌');
        logError(e);
    } finally {
        userRequests.release(m.sender);
    }
    }
});

;
