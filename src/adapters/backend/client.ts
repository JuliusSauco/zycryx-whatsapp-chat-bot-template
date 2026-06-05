import {httpJson, httpRequest, type HttpRequestOptions} from '../../lib/http-client.js';

export type BackendProtocol = 'rest' | 'graphql';

export interface BackendClientOptions {
    baseUrl: string;
    token?: string;
    protocol: BackendProtocol;
    timeoutMs: number;
}

export class BackendClient {
    constructor(private readonly options: BackendClientOptions) {
    }

    async rest<T>(path: string, init: HttpRequestOptions = {}): Promise<T> {
        return httpJson<T>(`${this.options.baseUrl}${path}`, {
            ...init,
            timeoutMs: this.options.timeoutMs,
            headers: this.headers(init.headers),
        });
    }

    async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
        const payload = await httpJson<{data?: T; errors?: unknown}>(this.options.baseUrl, {
            method: 'POST',
            timeoutMs: this.options.timeoutMs,
            headers: this.headers({'Content-Type': 'application/json'}),
            body: JSON.stringify({query, variables}),
        });
        if (payload.errors) throw new Error(`[BACKEND] GraphQL error: ${JSON.stringify(payload.errors)}`);
        return payload.data as T;
    }

    async raw(path: string, init: HttpRequestOptions = {}) {
        return httpRequest(`${this.options.baseUrl}${path}`, {
            ...init,
            timeoutMs: this.options.timeoutMs,
            headers: this.headers(init.headers),
        });
    }

    private headers(headers?: HttpRequestOptions['headers']): HttpRequestOptions['headers'] {
        return {
            ...(this.options.token ? {Authorization: `Bearer ${this.options.token}`} : {}),
            ...headers,
        };
    }
}
