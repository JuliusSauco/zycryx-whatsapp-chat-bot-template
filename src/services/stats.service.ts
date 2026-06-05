import {logError, logInfo, logWarn} from '../lib/logger.js';
import {repositories} from './data-source.js';

export function incrementCommandUsage(command: string): void {
    repositories.stats.incrementCommand(command).catch(logError);
}

export async function sumCommandUsage(): Promise<number> {
    return repositories.stats.sumCommands();
}
