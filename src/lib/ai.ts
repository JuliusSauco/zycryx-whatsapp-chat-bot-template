/**
 * Cliente de IA unificado con cadena de fallback entre proveedores.
 *
 * Todos los proveedores listados son compatibles con el formato de OpenAI
 * (mismo body, misma estructura de respuesta), así que se usan con un solo `fetch`.
 *
 * Las API keys se leen de la tabla `api_tokens` (columna `token_b64`, en base64)
 * y se cachean en memoria.
 *
 * Para agregar / reordenar / cambiar modelos: edita el array PROVIDERS.
 */
import fetch from 'node-fetch';
import {getDecodedApiToken, invalidateApiTokenCache} from '../services/api-token.service.js';

interface AIProvider {
    /** Nombre de la fila en api_tokens (columna `name`). */
    token: string;
    /** Endpoint compatible con OpenAI. */
    url: string;
    /** Modelo a usar. */
    model: string;
}

/**
 * Orden de intento: el primero que responda gana; si falla, se prueba el siguiente.
 *  - groq: tier gratuito (recomendado como principal).
 *  - xai : de pago (respaldo). Si el modelo 'grok-3' no existe en tu cuenta,
 *          cámbialo aquí por el que veas en console.x.ai.
 */
const PROVIDERS: AIProvider[] = [
    {token: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile'},
    {token: 'xai', url: 'https://api.x.ai/v1/chat/completions', model: 'grok-3'},
];

/** Limpia el cache de tokens (úsalo si actualizas una key sin reiniciar el bot). */
export function invalidateTokenCache(name?: string): void {
    invalidateApiTokenCache(name);
}

export interface ChatOptions {
    temperature?: number;
    maxTokens?: number;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatCompletionResponse {
    error?: unknown;
    choices?: Array<{
        message?: {
            content?: string;
        };
    }>;
}

/**
 * Genera una respuesta de chat probando los proveedores de PROVIDERS en orden.
 * `messages` es el array estilo OpenAI: [{role, content}, ...].
 * Devuelve el texto de la respuesta, o `null` si TODOS los proveedores fallan.
 */
export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string | null> {
    for (const provider of PROVIDERS) {
        const key = await getDecodedApiToken(provider.token);
        if (!key) {
            console.error(`[AI] sin token para '${provider.token}', se omite`);
            continue;
        }
        try {
            const res = await fetch(provider.url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages,
                    temperature: opts.temperature ?? 0.9,
                    max_tokens: opts.maxTokens ?? 600,
                }),
            });
            const data = await res.json() as ChatCompletionResponse;
            if (data?.error) {
                console.error(`[AI] '${provider.token}' devolvió error:`, JSON.stringify(data.error));
                continue;
            }
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (content) {
                console.log(`[AI] respuesta generada por '${provider.token}' (${provider.model})`);
                return content;
            }
            console.error(`[AI] '${provider.token}' devolvió una respuesta vacía`);
        } catch (e: unknown) {
            console.error(`[AI] '${provider.token}' falló:`, e instanceof Error ? e.message : e);
        }
    }
    return null;
}
