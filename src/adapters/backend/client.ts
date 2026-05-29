import fetch, {type RequestInit, type Response} from 'node-fetch';

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

    async rest<T>(path: string, init: RequestInit = {}): Promise<T> {
        const response = await this.fetch(`${this.options.baseUrl}${path}`, init);
        return response.json() as Promise<T>;
    }

    async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
        const response = await this.fetch(this.options.baseUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query, variables}),
        });
        const payload = await response.json() as {data?: T; errors?: unknown};
        if (payload.errors) throw new Error(`[BACKEND] GraphQL error: ${JSON.stringify(payload.errors)}`);
        return payload.data as T;
    }

    private async fetch(url: string, init: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
                headers: {
                    ...(this.options.token ? {Authorization: `Bearer ${this.options.token}`} : {}),
                    ...init.headers,
                },
            });

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw new Error(`[BACKEND] ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`);
            }

            return response as unknown as Response;
        } finally {
            clearTimeout(timeout);
        }
    }
}
