import {createDrizzleRepositories} from '../adapters/drizzle/repositories.js';
import {baileysAuthRepository} from '../adapters/drizzle/baileys-auth.repository.js';
import {db} from '../lib/postgres.js';
import {configureServiceRepositories} from '../services/data-source.js';

/** Único lugar donde la aplicación selecciona adapters concretos. */
const repositories = createDrizzleRepositories();
configureServiceRepositories(repositories);
export const application = Object.freeze({
    repositories,
    baileysAuth: baileysAuthRepository,
    databasePool: db,
});
