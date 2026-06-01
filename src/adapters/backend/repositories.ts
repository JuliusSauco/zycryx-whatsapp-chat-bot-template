import type {AppRepositories} from '../../ports/repositories.js';
import {BackendClient, type BackendProtocol} from './client.js';

export interface BackendRepositoryOptions {
    baseUrl: string;
    token?: string;
    protocol: BackendProtocol;
    timeoutMs: number;
}

type RepositoryName = keyof AppRepositories;

function createPendingRepository<T extends object>(name: RepositoryName, client: BackendClient): T {
    return new Proxy({}, {
        get(_target, property) {
            if (typeof property !== 'string') return undefined;

            return async () => {
                const protocol = (client as unknown as {options?: {protocol?: string}}).options?.protocol ?? 'backend';
                throw new Error(
                    `[DATA_SOURCE=backend] ${String(name)}.${property} no esta implementado para ${protocol}. ` +
                    'Define el contrato REST/GraphQL del backend y mapea este metodo en src/adapters/backend/repositories.ts.',
                );
            };
        },
    }) as T;
}

export function createBackendRepositories(options: BackendRepositoryOptions): AppRepositories {
    if (!options.baseUrl) {
        throw new Error('[DATA_SOURCE=backend] BACKEND_BASE_URL es obligatorio.');
    }

    const client = new BackendClient(options);

    return {
        users: createPendingRepository('users', client),
        chats: createPendingRepository('chats', client),
        messages: createPendingRepository('messages', client),
        stats: createPendingRepository('stats', client),
        subbots: createPendingRepository('subbots', client),
        characters: createPendingRepository('characters', client),
        apiTokens: createPendingRepository('apiTokens', client),
        audioResponses: createPendingRepository('audioResponses', client),
        groupSettings: createPendingRepository('groupSettings', client),
        reports: createPendingRepository('reports', client),
        chatMemory: createPendingRepository('chatMemory', client),
        database: createPendingRepository('database', client),
    };
}
