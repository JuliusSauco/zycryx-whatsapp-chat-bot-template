import {externalApis} from '../providers/external-api-config.js';
import {httpJson} from '../lib/http-client.js';

interface TextApiResponse {
    data?: string;
}

export async function requestPublicPromptCompletion(query: string, systemPrompt: string): Promise<string> {
    const res = await httpJson<TextApiResponse>(`${externalApis.main.url}/ia/gptprompt?text=${encodeURIComponent(query)}&prompt=${encodeURIComponent(systemPrompt)}`);
    return res.data || '';
}
