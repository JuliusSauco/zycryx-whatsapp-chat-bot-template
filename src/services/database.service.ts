import type {DatabaseInfo, SyncedDataResetResult} from '../ports/repositories.js';
import {repositories} from './data-source.js';
import {invalidateAllDatabaseCaches} from '../lib/db-cache.js';
import {groupMetadataCache} from '../core/group-metadata-cache.js';

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
    return repositories.database.getInfo();
}

export async function resetSyncedData(): Promise<SyncedDataResetResult> {
    const result = await repositories.database.resetSyncedData();
    invalidateAllDatabaseCaches();
    groupMetadataCache.clear();
    return result;
}
