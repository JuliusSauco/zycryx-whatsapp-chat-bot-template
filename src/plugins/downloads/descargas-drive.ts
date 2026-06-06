import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {httpJson} from '../../lib/http-client.js';
import {runFirstProvider, type Provider} from '../../lib/provider-fallback.js';
import {replyReportableError} from '../../lib/reply-helpers.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';

interface DriveFileData {
    url: string
    filename: string
}

interface SiputzDriveResponse {
    data?: {
        download?: string
        name?: string
    }
}

interface DavidDriveResponse {
    download_link?: string
    name?: string
}

const userCaptions = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['drive'].map(v => v + ' <url>'),
    tags: ['downloader'],
    command: /^(drive|drivedl|dldrive|gdrive)$/i,
    register: true,
    limit: 3,
    async execute(m, {conn, args, usedPrefix, command}) {
    if (!args[0]) return m.reply(`⚠️ Ingrese una Url de Drive\n• Ejemplo: ${usedPrefix + command} https://drive.google.com/file/d/1-8BSwPSAycKYMqveGm_JTu2c_wIDkJIt/view?usp=drivesdk`)

    if (!userRequests.acquire(m.sender)) {
        conn.reply(m.chat, `⏳ *Hey @${m.sender.split('@')[0]} Espera...* Ya hay una solicitud en proceso. Por favor, espera a que termine antes de hacer otra...`, userCaptions.get(m.sender) || m)
        return;
    }
    m.react("📥");
    try {
        const waitMessageSent = await conn.reply(m.chat, `*⌛ 𝐂𝐚𝐥𝐦𝐚 ✋ 𝐂𝐥𝐚𝐜𝐤, 𝐘𝐚 𝐞𝐬𝐭𝐨𝐲 𝐄𝐧𝐯𝐢𝐚𝐝𝐨 𝐞𝐥 𝐚𝐫𝐜𝐡𝐢𝐯𝐨 🚀*\n*𝐒𝐢 𝐧𝐨 𝐥𝐞 𝐥𝐥𝐞𝐠𝐚 𝐞𝐥 𝐚𝐫𝐜𝐡𝐢𝐯𝐨 𝐞𝐬 𝐝𝐞𝐛𝐢𝐝𝐨 𝐚 𝐪𝐮𝐞 𝐞𝐬 𝐦𝐮𝐲 𝐩𝐞𝐬𝐚𝐝𝐨*`, m)
        userCaptions.set(m.sender, waitMessageSent);
        const downloadProviders: Array<Provider<DriveFileData>> = [
            {
                name: 'siputz-gdrive',
                run: async () => {
                const data = await httpJson<SiputzDriveResponse>(`https://api.siputzx.my.id/api/d/gdrive?url=${args[0]}`);
                if (!data.data?.download || !data.data?.name) throw new Error('Respuesta inválida de Siputz');
                return {
                    url: data.data.download,
                    filename: data.data.name,
                };
            },
            },
            {
                name: 'david-cyril-gdrive',
                run: async () => {
                const data = await httpJson<DavidDriveResponse>(`https://apis.davidcyriltech.my.id/gdrive?url=${args[0]}`);
                if (!data.download_link || !data.name) throw new Error('Respuesta inválida de David Cyril');
                return {
                    url: data.download_link,
                    filename: data.name,
                }
            },
            },
        ];

        const fileData = await runFirstProvider(downloadProviders, 'No se pudo descargar el archivo desde ninguna API');

        const {url, filename} = fileData;
        const mimetype = getMimetype(filename);
        await conn.sendMessage(m.chat, {
            document: {url: url},
            mimetype: mimetype,
            fileName: filename,
            caption: undefined
        }, {quoted: m});
        await m.react("✅");
    } catch (e: unknown) {
        m.react(`❌`);
        await replyReportableError(m, e);
        logInfo(e);
    } finally {
        userRequests.release(m.sender);
    }
    }
});

;

const getMimetype = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'mp4': 'video/mp4',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'zip': 'application/zip',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'mp3': 'audio/mpeg',
        'apk': 'application/vnd.android.package-archive',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'mkv': 'video/x-matroska',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'ogg': 'audio/ogg',
        'wav': 'audio/wav',
    };
    return mimeTypes[extension] || 'application/octet-stream'; // Tipo por defecto
};
