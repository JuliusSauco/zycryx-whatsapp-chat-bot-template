import {createDrizzleRepositories} from '../adapters/drizzle/repositories.js';
import type {AppRepositories} from '../ports/repositories.js';

function createRepositories(): AppRepositories {
    return createDrizzleRepositories();
}

export const repositories = createRepositories();
