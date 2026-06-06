import {enqueueBackgroundTask} from '../lib/background-task-queue.js';
import {repositories} from './data-source.js';

export function incrementCommandUsage(command: string): void {
    enqueueBackgroundTask('increment-command-usage', () => repositories.stats.incrementCommand(command));
}

export async function sumCommandUsage(): Promise<number> {
    return repositories.stats.sumCommands();
}
