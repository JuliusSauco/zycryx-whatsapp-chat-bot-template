import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {httpJson} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {runFirstProvider, type Provider} from '../../lib/provider-fallback.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';

interface ApkData {
    name: string
    package?: string
    developer?: string
    publish?: string
    lastUpdate?: string
    size: string
    icon: string
    dllink: string
}

interface DorratzApkResponse {
    name?: string
    package?: string
    lastUpdate?: string
    size?: string
    icon?: string
    dllink?: string
}

interface MainApkResponse {
    data?: {
        name?: string
        developer?: string
        publish?: string
        size?: string
        image?: string
        download?: string
    }
}

const userMessages = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['apk', 'apkmod'],
    tags: ['downloader'],
    command: /^(apkmod|apk|modapk|dapk2|aptoide|aptoidedl)$/i,
    register: true,
    limit: 2,
    async execute(m, {conn, text}) {
    if (!text) return m.reply(getRequiredPluginMessage('downloads.modApk.missingQuery'))
    if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.modApk.locked'), {
        user: m.sender.split('@')[0]
    }), userMessages.get(m.sender) || m)
    m.react("⌛");
    try {
        const downloadProviders: Array<Provider<ApkData>> = [
            {
                name: 'dorratz-apk',
                run: async () => {
                    const data = await httpJson<DorratzApkResponse>(`https://api.dorratz.com/v2/apk-dl?text=${text}`);
                    if (!data.name || !data.size || !data.icon || !data.dllink) throw new Error('No data from dorratz API');
                    return {
                        name: data.name,
                        package: data.package,
                        lastUpdate: data.lastUpdate,
                        size: data.size,
                        icon: data.icon,
                        dllink: data.dllink
                    };
                },
            },
            {
                name: 'main-apk',
                run: async () => {
                    const data = await httpJson<MainApkResponse>(`${info.apis}/download/apk?query=${text}`);
                    const apkData = data.data;
                    if (!apkData?.name || !apkData.size || !apkData.image || !apkData.download) throw new Error('Respuesta inválida de API principal');
                    return {
                        name: apkData.name,
                        developer: apkData.developer,
                        publish: apkData.publish,
                        size: apkData.size,
                        icon: apkData.image,
                        dllink: apkData.download
                    };
                },
            },
        ];

        const apkData = await runFirstProvider(downloadProviders, 'No se pudo descargar el APK desde ninguna API');
        const developerOrPackage = apkData.developer
            ? renderTemplate(getRequiredPluginMessage('downloads.modApk.developerLine'), {developer: apkData.developer})
            : renderTemplate(getRequiredPluginMessage('downloads.modApk.packageLine'), {package: apkData.package});
        const response = renderTemplate(getRequiredPluginMessage('downloads.modApk.response'), {
            name: apkData.name,
            developerOrPackage,
            updatedAt: apkData.developer ? apkData.publish : apkData.lastUpdate,
            size: apkData.size
        });
        const responseMessage = await conn.sendFile(m.chat, apkData.icon, 'apk.jpg', response, m);
        userMessages.set(m.sender, responseMessage);

        const apkSize = apkData.size.toLowerCase();
        if (apkSize.includes('gb') || (apkSize.includes('mb') && parseFloat(apkSize) > 999)) {
            await m.reply(getRequiredPluginMessage('downloads.modApk.tooLarge'));
            return;
        }

        await conn.sendMessage(m.chat, {
            document: {url: apkData.dllink},
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${apkData.name}.apk`,
            caption: undefined
        }, {quoted: m});
        m.react("✅");
    } catch (e: unknown) {
        m.react('❌');
        logInfo(e);
    } finally {
        userRequests.release(m.sender);
    }
    }
});
