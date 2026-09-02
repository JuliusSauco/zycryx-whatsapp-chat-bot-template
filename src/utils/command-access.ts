import type {CommandAccessRule} from '../domain/groups.js';

export const CENSORED_COMMAND_ACCESS_KEY = 'censored';
export const DAILY_REMINDER_COMMAND_ACCESS_KEY = 'daily-reminder';

export function defaultCommandAccess(command: string): CommandAccessRule {
    if (command === CENSORED_COMMAND_ACCESS_KEY || command === DAILY_REMINDER_COMMAND_ACCESS_KEY) {
        return {enabled: true, accessMode: 'admin'};
    }
    return {enabled: true, accessMode: 'all'};
}
