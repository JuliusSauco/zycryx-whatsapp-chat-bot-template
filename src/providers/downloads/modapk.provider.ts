import {externalApis} from '../external-api-config.js';
import {httpJson} from '../../lib/http-client.js';
import {DEFAULT_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export interface ModApkProviderData {
    name: string;
    package?: string;
    developer?: string;
    publish?: string;
    lastUpdate?: string;
    size: string;
    icon: string;
    downloadUrl: string;
}

interface DorratzApkResponse {
    name?: string;
    package?: string;
    lastUpdate?: string;
    size?: string;
    icon?: string;
    dllink?: string;
}

interface MainApkResponse {
    data?: {
        name?: string;
        developer?: string;
        publish?: string;
        size?: string;
        image?: string;
        download?: string;
    };
}

export function buildModApkDownloadProviders(query: string): ProviderCandidate<ModApkProviderData>[] {
    return withProviderPolicy<ModApkProviderData>([
        {
            name: 'dorratz-apk',
            run: async () => {
                const data = await httpJson<DorratzApkResponse>(`https://api.dorratz.com/v2/apk-dl?text=${encodeURIComponent(query)}`);
                if (!data.name || !data.size || !data.icon || !data.dllink) return null;
                return {
                    name: data.name,
                    package: data.package,
                    lastUpdate: data.lastUpdate,
                    size: data.size,
                    icon: data.icon,
                    downloadUrl: data.dllink,
                };
            },
        },
        {
            name: 'main-apk',
            run: async () => {
                const data = await httpJson<MainApkResponse>(`${externalApis.main.url}/download/apk?query=${encodeURIComponent(query)}`);
                const apkData = data.data;
                if (!apkData?.name || !apkData.size || !apkData.image || !apkData.download) return null;
                return {
                    name: apkData.name,
                    developer: apkData.developer,
                    publish: apkData.publish,
                    size: apkData.size,
                    icon: apkData.image,
                    downloadUrl: apkData.download,
                };
            },
        },
    ], {timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function downloadModApk(query: string): Promise<ProviderResult<ModApkProviderData>> {
    return runProviderCandidates(buildModApkDownloadProviders(query));
}
