import {repositories} from './data-source.js';

export async function listExpiredGroups(now: number) {
    return repositories.groupSettings.listExpiredGroups(now);
}

export async function clearGroupExpiration(groupId: string): Promise<void> {
    await repositories.groupSettings.clearExpiration(groupId);
}

export async function listPendingReports(limit: number) {
    return repositories.reports.listPending(limit);
}

export async function createReport(input: {
    senderId: string;
    senderName: string | null;
    message: string;
    type: string;
}): Promise<void> {
    await repositories.reports.create(input);
}

export async function deleteReport(id: number): Promise<void> {
    await repositories.reports.deleteById(id);
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
