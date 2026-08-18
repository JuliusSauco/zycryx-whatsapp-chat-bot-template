import type {AppRepositories} from '../ports/repositories.js';

let configuredRepositories: AppRepositories | null = null;

export function configureServiceRepositories(repositories: AppRepositories): void {
    if (configuredRepositories && configuredRepositories !== repositories) {
        throw new Error('Los repositorios de aplicación ya fueron configurados.');
    }
    configuredRepositories = repositories;
}

export function createRepositories(): AppRepositories {
    if (!configuredRepositories) throw new Error('Los repositorios no fueron inyectados desde el composition root.');
    return configuredRepositories;
}

/** Fachada compatible sin dependencia services -> core/adapters. */
export const repositories = new Proxy({} as AppRepositories, {
    get(_target, property: keyof AppRepositories) {
        return createRepositories()[property];
    },
});
