import type {DatabaseInfo} from '../ports/repositories.js';
import {repositories} from './data-source.js';

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
    return repositories.database.getInfo();
}

export async function vacuumDatabase(): Promise<void> {
    await repositories.database.vacuumFull();
}
