import {externalApis} from '../external-api-config.js';

export function buildTextImageUrl(text: string): string {
    if (!externalApis.fgmods.key) throw new Error('FGMODS_API_KEY no configurado');
    return `${externalApis.fgmods.url}/maker/txt?text=${encodeURIComponent(text)}&apikey=${externalApis.fgmods.key}`;
}
