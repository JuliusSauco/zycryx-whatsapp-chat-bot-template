import {httpJson} from '../../lib/http-client.js';
import {externalApis} from '../external-api-config.js';

interface ReminiResponse { status?: boolean; data?: {url?: string} }

export async function enhanceImage(imageUrl: string): Promise<string | null> {
    if (!externalApis.neoxr.key) throw new Error('NEOXR_API_KEY no configurado');
    const result = await httpJson<ReminiResponse>(
        `${externalApis.neoxr.url}/remini?image=${encodeURIComponent(imageUrl)}&apikey=${externalApis.neoxr.key}`,
    );
    return result.status ? result.data?.url ?? null : null;
}
