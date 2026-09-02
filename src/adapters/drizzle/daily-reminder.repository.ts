import {and, eq, isNull, or, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    botChatMemberships, groupDailyReminderDeliveries, groupDailyReminderSettings, groupSettings,
} from '../../db/schema.js';
import type {DailyReminderRepository} from '../../ports/repositories.js';

export const dailyReminderRepository: DailyReminderRepository = {
    async findSettings(groupId) {
        const [row] = await orm.select({
            enabled: groupDailyReminderSettings.enabled,
            localTime: groupDailyReminderSettings.localTime,
            timezone: groupDailyReminderSettings.timezone,
        }).from(groupDailyReminderSettings)
            .where(eq(groupDailyReminderSettings.groupId, groupId))
            .limit(1);
        return row ?? null;
    },

    async setEnabled(groupId, enabled, updatedBy) {
        await orm.insert(groupDailyReminderSettings).values({groupId, enabled, updatedBy})
            .onConflictDoUpdate({
                target: groupDailyReminderSettings.groupId,
                set: {enabled, updatedBy, updatedAt: new Date()},
            });
    },

    async claimForBot(botId, activityDay) {
        const candidates = await orm.select({groupId: groupSettings.groupId})
            .from(botChatMemberships)
            .innerJoin(groupSettings, eq(groupSettings.groupId, botChatMemberships.chatId))
            .leftJoin(groupDailyReminderSettings, eq(groupDailyReminderSettings.groupId, groupSettings.groupId))
            .leftJoin(groupDailyReminderDeliveries, and(
                eq(groupDailyReminderDeliveries.groupId, groupSettings.groupId),
                eq(groupDailyReminderDeliveries.activityDay, activityDay),
            ))
            .where(and(
                eq(botChatMemberships.botId, botId),
                eq(botChatMemberships.joined, true),
                eq(groupSettings.banned, false),
                or(isNull(groupSettings.primaryBot), eq(groupSettings.primaryBot, botId)),
                sql`COALESCE(${groupDailyReminderSettings.enabled}, true) = true`,
                isNull(groupDailyReminderDeliveries.groupId),
            ));
        const claimed: string[] = [];
        for (const candidate of candidates) {
            const [row] = await orm.insert(groupDailyReminderDeliveries).values({
                groupId: candidate.groupId, activityDay, botId,
            }).onConflictDoNothing().returning({groupId: groupDailyReminderDeliveries.groupId});
            if (row) claimed.push(row.groupId);
        }
        return claimed;
    },

    async markSent(groupId, activityDay, messageId) {
        await orm.update(groupDailyReminderDeliveries).set({
            status: 'sent', messageId, sentAt: new Date(), lastError: null, updatedAt: new Date(),
        }).where(and(
            eq(groupDailyReminderDeliveries.groupId, groupId),
            eq(groupDailyReminderDeliveries.activityDay, activityDay),
        ));
    },

    async markFailed(groupId, activityDay, error) {
        await orm.update(groupDailyReminderDeliveries).set({
            status: 'failed', lastError: error.slice(0, 1000), updatedAt: new Date(),
        }).where(and(
            eq(groupDailyReminderDeliveries.groupId, groupId),
            eq(groupDailyReminderDeliveries.activityDay, activityDay),
        ));
    },
};
