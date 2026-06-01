import {repositories} from './data-source.js';

export async function upsertActiveChat(input: {
    chatId: string;
    isGroup: boolean;
    timestamp: number;
    botId: string;
}): Promise<void> {
    await repositories.chats.upsertActiveChat(input);
    await repositories.chats.insertIfMissing(input.chatId);
}

export async function markBotLeftGroup(groupId: string, botId: string): Promise<void> {
    await repositories.chats.markBotLeftGroup(groupId, botId);
}

export async function listJoinedGroupIdsByBot(botId: string): Promise<string[]> {
    return repositories.chats.listJoinedGroupIdsByBot(botId);
}

export async function countChats(): Promise<number> {
    return repositories.chats.countChats();
}

export async function countChatsByBot(botId: string): Promise<{
    totalGroups: number;
    joinedGroups: number;
    privateChats: number;
}> {
    return repositories.chats.countByBot(botId);
}

export async function incrementMessageCount(userId: string, groupId: string): Promise<void> {
    await repositories.messages.incrementUserGroupCount(userId, groupId);
}

export async function deleteMessageCount(userId: string, groupId: string): Promise<void> {
    await repositories.messages.deleteUserGroupCount(userId, groupId);
}

export async function listGroupMessageCounts(groupId: string): Promise<Array<{
    user_id: string;
    message_count: number;
}>> {
    return repositories.messages.listGroupCounts(groupId);
}

export async function logGroupMessage(input: {
    groupId: string;
    userId: string;
    messageId: string;
    messageText: string;
    messageType: 'text' | 'multimedia';
    isReply: boolean;
    replyToMessageId: string | null;
}): Promise<void> {
    await repositories.messageLogs.create(input);
}

export async function markGroupMessageDeleted(input: {
    groupId: string;
    messageId: string;
    deletedBy: string | null;
    deletedByLid: string | null;
    deletedAt: Date;
}): Promise<void> {
    await repositories.messageLogs.markDeleted(input);
}
