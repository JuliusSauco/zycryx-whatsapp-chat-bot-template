import {DEFAULT_DAILY_REMINDER_SETTINGS, type DailyReminderSettings} from '../domain/daily-reminders.js';
import {renderMessage} from './content.service.js';
import {repositories} from './data-source.js';

export async function getDailyReminderSettings(groupId: string): Promise<DailyReminderSettings> {
    return await repositories.dailyReminders.findSettings(groupId) ?? {...DEFAULT_DAILY_REMINDER_SETTINGS};
}

export async function setDailyReminderEnabled(groupId: string, enabled: boolean, updatedBy: string): Promise<void> {
    await repositories.dailyReminders.setEnabled(groupId, enabled, updatedBy);
}

export function createDailyReminderContent(groupName: string): {text: string} {
    return {text: renderMessage('dailyReminder.message', {groupName})};
}
