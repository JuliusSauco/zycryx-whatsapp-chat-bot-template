import {repositories} from './data-source.js';

export function incrementCommandUsage(command: string): void {
    repositories.stats.incrementCommand(command).catch(console.error);
}

export async function sumCommandUsage(): Promise<number> {
    return repositories.stats.sumCommands();
}
