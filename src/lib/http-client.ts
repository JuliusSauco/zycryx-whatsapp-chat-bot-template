import fetch, {type RequestInit, type Response} from 'node-fetch';
import {logDebug} from './logger.js';

const DEFAULT_TIMEOUT_MS = 15_000;

export class HttpError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly statusText: string,
        readonly url: string,
        readonly body: string,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export interface HttpRequestOptions extends RequestInit {
    timeoutMs?: number;
    expectedStatuses?: number[];
}

export function getDefaultHttpTimeoutMs(): number {
    const configured = Number(process.env.HTTP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
}

export async function httpRequest(url: string, options: HttpRequestOptions = {}): Promise<Response> {
    const timeoutMs = options.timeoutMs ?? getDefaultHttpTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    const {timeoutMs: _timeoutMs, expectedStatuses, signal: _signal, ...init} = options;

    try {
        const response = await fetch(url, {
            ...init,
            signal: controller.signal as RequestInit['signal'],
        });
        const ok = response.ok || expectedStatuses?.includes(response.status);

        if (!ok) {
            const body = await response.text().catch(() => '');
            throw new HttpError(
                `[HTTP] ${response.status} ${response.statusText} ${url}${body ? `: ${body.slice(0, 500)}` : ''}`,
                response.status,
                response.statusText,
                url,
                body,
            );
        }

        logDebug(`[HTTP] ${init.method || 'GET'} ${url} ${response.status} ${Date.now() - startedAt}ms`);
        return response as unknown as Response;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`[HTTP] Timeout ${timeoutMs}ms: ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export async function httpJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const response = await httpRequest(url, options);
    return response.json() as Promise<T>;
}

export async function httpText(url: string, options: HttpRequestOptions = {}): Promise<string> {
    const response = await httpRequest(url, options);
    return response.text();
}

export async function httpBuffer(url: string, options: HttpRequestOptions = {}): Promise<Buffer> {
    const response = await httpRequest(url, options);
    return Buffer.from(await response.arrayBuffer());
}
