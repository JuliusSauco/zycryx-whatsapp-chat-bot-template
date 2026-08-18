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
    get(_target, property: keyof AppRepositories | 'users') {
        if (property === 'users') return createRepositories().userEconomy;
        return createRepositories()[property];
    },
    set(_target, property: keyof AppRepositories | 'users', value) {
        if (property === 'users') {
            const configured = createRepositories();
            configured.userIdentity = value as AppRepositories['userIdentity'];
            configured.userRegistration = value as AppRepositories['userRegistration'];
            configured.userModeration = value as AppRepositories['userModeration'];
            configured.userRelationships = value as AppRepositories['userRelationships'];
            configured.userEconomy = value as AppRepositories['userEconomy'];
            configured.userPreferences = value as AppRepositories['userPreferences'];
            return true;
        }
        createRepositories()[property] = value as never;
        return true;
    },
});
