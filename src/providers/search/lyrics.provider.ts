import {httpJson} from '../../lib/http-client.js';
import {runFirstProvider} from '../../lib/provider-fallback.js';
import {externalApis} from '../external-api-config.js';

export interface LyricsResult {
    title?: string;
    artist?: string;
    artistUrl?: string;
    url?: string;
    image?: string;
    lyrics?: string;
}

interface FgmodsLyricsResponse { result?: LyricsResult }
interface ApiLyricsResponse { status?: string; data?: LyricsResult }

export function searchLyrics(query: string): Promise<LyricsResult> {
    return runFirstProvider([
        {
            name: 'fgmods-lyrics',
            run: async () => {
                if (!externalApis.fgmods.key) return null;
                const data = await httpJson<FgmodsLyricsResponse>(
                    `${externalApis.fgmods.url}/other/lyrics?text=${encodeURIComponent(query)}&apikey=${externalApis.fgmods.key}`,
                );
                return data.result ?? null;
            },
        },
        {
            name: 'main-lyrics',
            run: async () => {
                const data = await httpJson<ApiLyricsResponse>(`${externalApis.main.url}/search/letra?query=${encodeURIComponent(query)}`);
                return data.status === '200' ? data.data ?? null : null;
            },
        },
    ], 'No se encontró la letra solicitada.');
}
