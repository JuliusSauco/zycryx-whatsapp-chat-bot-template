import {logWarn} from '../lib/logger.js';
import {createBackendRepositories} from '../adapters/backend/repositories.js';
import {createDrizzleRepositories} from '../adapters/drizzle/repositories.js';
import {ENV} from '../core/env.js';
import type {AppRepositories} from '../ports/repositories.js';

function createRepositories(): AppRepositories {
    if (ENV.DATA_SOURCE === 'backend') {
        return createBackendRepositories({
            baseUrl: ENV.BACKEND_BASE_URL,
            token: ENV.BACKEND_API_TOKEN,
            protocol: ENV.BACKEND_PROTOCOL === 'graphql' ? 'graphql' : 'rest',
            timeoutMs: ENV.BACKEND_TIMEOUT_MS,
        });
    }

    if (ENV.DATA_SOURCE !== 'local') {
        logWarn(`[DATA_SOURCE] "${ENV.DATA_SOURCE}" no es valido. Usando "local".`);
    }
    return createDrizzleRepositories();
}

export const repositories = createRepositories();
