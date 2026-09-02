export const DAILY_REMINDER_TIME_ZONE = 'America/Bogota';
export const DAILY_REMINDER_START_HOUR = 8;
export const DAILY_REMINDER_CATCHUP_END_HOUR = 10;

export interface DailyReminderSettings {
    enabled: boolean;
    localTime: string;
    timezone: string;
}

export const DEFAULT_DAILY_REMINDER_SETTINGS: Readonly<DailyReminderSettings> = Object.freeze({
    enabled: true,
    localTime: '08:00',
    timezone: DAILY_REMINDER_TIME_ZONE,
});

const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_REMINDER_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
});

export function getBogotaReminderWindow(now: Date): {activityDay: string; shouldRun: boolean} {
    const parts = formatter.formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
    const hour = Number(value('hour'));
    return {
        activityDay: `${value('year')}-${value('month')}-${value('day')}`,
        shouldRun: hour >= DAILY_REMINDER_START_HOUR && hour < DAILY_REMINDER_CATCHUP_END_HOUR,
    };
}
