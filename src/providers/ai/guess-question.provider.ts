import {httpJson} from '../../lib/http-client.js';
import {externalApis} from '../external-api-config.js';

export interface GeneratedGuessQuestion {
    question: string;
    response: string;
}

interface NeoxrGptResponse { data?: string }

export async function generateGuessQuestion(prompt: string): Promise<GeneratedGuessQuestion | null> {
    if (!externalApis.neoxr.key) return null;
    const json = await httpJson<NeoxrGptResponse>(
        `${externalApis.neoxr.url}/gptweb?text=${encodeURIComponent(prompt)}&apikey=${externalApis.neoxr.key}`,
    );
    if (!json.data) return null;
    const match = json.data.match(/```json\s*([\s\S]*?)\s*```/);
    const parsed = JSON.parse(match ? match[1] : json.data) as Partial<GeneratedGuessQuestion>;
    return parsed.question && parsed.response ? {question: parsed.question, response: parsed.response} : null;
}
