import {repositories} from './data-source.js';
import {releaseExpiredCommandResources} from './resource.service.js';
import {refreshBankLoanStatuses} from './bank.service.js';
import {renewDueSecuritySubscriptions} from './store.service.js';

export async function listExpiredGroups(now: number) {
    return repositories.groupSettings.listExpiredGroups(now);
}

export async function clearGroupExpiration(groupId: string): Promise<void> {
    await repositories.groupSettings.clearExpiration(groupId);
}

export async function claimPendingReports(limit: number, workerId: string, leaseSeconds = 120) {
    return repositories.reports.claimPending(limit, workerId, leaseSeconds);
}

export async function createReport(input: {
    senderId: string;
    senderName: string | null;
    message: string;
    type: string;
}): Promise<void> {
    await repositories.reports.create(input);
}

export async function markReportDelivered(id: number, workerId: string, deliveredMessageId: string | null): Promise<void> {
    await repositories.reports.markDelivered(id, workerId, deliveredMessageId);
}

export async function markReportFailed(id: number, workerId: string, error: string): Promise<void> {
    await repositories.reports.markFailed(id, workerId, error);
}

export async function cleanExpiredChatMemories(now: number = Date.now()): Promise<string[]> {
    const rows = await repositories.chatMemory.listExpirable();
    const deleted: string[] = [];

    for (const row of rows) {
        const lastUpdated = new Date(row.updated_at).getTime();
        const ttl = row.memory_ttl * 1000;

        if (now - lastUpdated > ttl) {
            await repositories.chatMemory.deleteByChatId(row.chat_id);
            deleted.push(row.chat_id);
        }
    }

    return deleted;
}

export async function cleanExpiredCommandResourceReservations(now = new Date()): Promise<number> {
    return releaseExpiredCommandResources(now);
}

export async function updateBankLoanStatuses(now = new Date()): Promise<number> {
    return refreshBankLoanStatuses(now);
}

export function renewStoreSubscriptions(now = new Date()) {
    return renewDueSecuritySubscriptions(now);
}

export function claimDailyGroupReminders(botId: string, activityDay: string) {
    return repositories.dailyReminders.claimForBot(botId, activityDay);
}

export function markDailyGroupReminderSent(groupId: string, activityDay: string, messageId: string | null) {
    return repositories.dailyReminders.markSent(groupId, activityDay, messageId);
}

export function markDailyGroupReminderFailed(groupId: string, activityDay: string, error: string) {
    return repositories.dailyReminders.markFailed(groupId, activityDay, error);
}
