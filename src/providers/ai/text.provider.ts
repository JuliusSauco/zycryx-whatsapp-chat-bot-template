import {chatCompletion, type ChatMessage} from '../../lib/ai.js';
import {httpJson} from '../../lib/http-client.js';
import {blackboxAi} from '../../lib/scraper.js';
import {LONG_PROVIDER_TIMEOUT_MS, runProviderCandidates, type ProviderCandidate, type ProviderResult, withProviderPolicy} from '../provider.types.js';

export interface AiTextOptions {
    fallbackText: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

interface TextApiResponse {
    data?: string;
    result?: string;
    gpt?: string;
    message?: string;
}

interface BingResponse {
    result?: {
        ai_response?: string;
    };
}

export async function generateMemoryChatResponse(
    prompt: string,
    memory: ChatMessage[],
    options: AiTextOptions,
): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildMemoryChatProviders(prompt, memory, options));
}

export function buildMemoryChatProviders(
    prompt: string,
    memory: ChatMessage[],
    options: AiTextOptions,
): ProviderCandidate<string>[] {
    return withProviderPolicy([
        {
            name: 'configured-chat-completion',
            retries: 0,
            run: async () => chatCompletion(memory, {
                temperature: options.temperature ?? 0.9,
                maxTokens: options.maxTokens ?? 600,
            }),
        },
        {
            name: 'main-gpt-prompt',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`${info.apis}/ia/gptprompt?text=${encodeURIComponent(prompt)}&prompt=${encodeURIComponent(options.systemPrompt || '')}`);
                return res.data || null;
            },
        },
    ], {timeoutMs: LONG_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function generateOpenAiText(prompt: string): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildOpenAiTextProviders(prompt));
}

export function buildOpenAiTextProviders(prompt: string): ProviderCandidate<string>[] {
    return withProviderPolicy([
        {
            name: 'dorratz-gpt',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`https://api.dorratz.com/ai/gpt?prompt=${encodeURIComponent(prompt)}`);
                return decodeApiText(res.result);
            },
        },
        {
            name: 'main-gptweb',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`${info.apis}/ia/gptweb?text=${encodeURIComponent(prompt)}`);
                return res.gpt || null;
            },
        },
        {
            name: 'main-ia2',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`${info.apis}/api/ia2?text=${encodeURIComponent(prompt)}`);
                return res.gpt || null;
            },
        },
        {
            name: 'main-chatgpt',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`${info.apis}/ia/chatgpt?q=${encodeURIComponent(prompt)}`);
                return res.data || null;
            },
        },
    ], {timeoutMs: LONG_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function generateDeepSeekText(prompt: string): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildDeepSeekTextProviders(prompt));
}

export function buildDeepSeekTextProviders(prompt: string): ProviderCandidate<string>[] {
    return withProviderPolicy([
        {
            name: 'dorratz-deepseek',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`https://api.dorratz.com/ai/deepseek?prompt=${encodeURIComponent(prompt)}`);
                return decodeApiText(res.result);
            },
        },
    ], {timeoutMs: LONG_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function generateGeminiText(prompt: string): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildGeminiTextProviders(prompt));
}

export function buildGeminiTextProviders(prompt: string): ProviderCandidate<string>[] {
    return withProviderPolicy([
        {
            name: 'dorratz-gemini',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`https://api.dorratz.com/ai/gemini?prompt=${encodeURIComponent(prompt)}`);
                return res.message || null;
            },
        },
        {
            name: 'delirius-gemini',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`https://delirius-apiofc.vercel.app/ia/gemini?query=${encodeURIComponent(prompt)}`);
                return res.message || null;
            },
        },
    ], {timeoutMs: LONG_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function generateBlackboxText(prompt: string): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildBlackboxTextProviders(prompt));
}

export function buildBlackboxTextProviders(prompt: string): ProviderCandidate<string>[] {
    return withProviderPolicy([
        {
            name: 'blackbox-ai',
            run: async () => {
                const result = await blackboxAi(prompt);
                if (!result.status) throw new Error(result.error || 'blackbox error');
                return result.data.response || null;
            },
        },
    ], {timeoutMs: LONG_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function generateCopilotText(prompt: string): Promise<ProviderResult<string>> {
    return runProviderCandidates(buildCopilotTextProviders(prompt));
}

export function buildCopilotTextProviders(prompt: string): ProviderCandidate<string>[] {
    return withProviderPolicy([
        {
            name: 'dorratz-bing',
            run: async () => {
                const res = await httpJson<BingResponse>(`https://api.dorratz.com/ai/bing?prompt=${encodeURIComponent(prompt)}`);
                return res.result?.ai_response || null;
            },
        },
        {
            name: 'main-bingia',
            run: async () => {
                const res = await httpJson<TextApiResponse>(`${info.apis}/ia/bingia?query=${encodeURIComponent(prompt)}`);
                return res.message || null;
            },
        },
    ], {timeoutMs: LONG_PROVIDER_TIMEOUT_MS, retries: 1});
}

export function decodeApiText(value: string | undefined): string | null {
    if (!value) return null;
    try {
        return JSON.parse(`"${value}"`) as string;
    } catch {
        return value;
    }
}
