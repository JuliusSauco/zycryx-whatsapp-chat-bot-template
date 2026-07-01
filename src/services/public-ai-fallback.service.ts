import {httpJson} from '../lib/http-client.js';

interface TextApiResponse {
    data?: string;
}

export async function requestPublicPromptCompletion(query: string, systemPrompt: string): Promise<string> {
    const res = await httpJson<TextApiResponse>(`${info.apis}/ia/gptprompt?text=${encodeURIComponent(query)}&prompt=${encodeURIComponent(systemPrompt)}`);
    return res.data || '';
}
