import {
    getCachedGroupSettings,
    getCachedFullGroupSettings,
    invalidateGroupSettings,
    setCachedFullGroupSettings,
    setCachedGroupSettings,
} from '../lib/db-cache.js';
import {repositories} from './data-source.js';
import type {AutoAcceptMode} from '../types/config.js';

export interface ContextGroupSettings {
    banned: boolean;
    primary_bot: string | null;
    modoadmin: boolean;
    antifake: boolean;
    message_logging: boolean;
}

const EMPTY_CONTEXT_SETTINGS: ContextGroupSettings = {
    banned: false,
    primary_bot: null,
    modoadmin: false,
    antifake: false,
    message_logging: false,
};

export async function getContextGroupSettings(chatId: string): Promise<ContextGroupSettings> {
    const cached = getCachedGroupSettings<ContextGroupSettings>(chatId);
    if (cached) return cached;

    try {
        const row = await repositories.groupSettings.findContextSettings(chatId);
        const settings = row ?? EMPTY_CONTEXT_SETTINGS;
        setCachedGroupSettings(chatId, settings);
        return settings;
    } catch (err) {
        console.error('Error leyendo group_settings:', err);
        return EMPTY_CONTEXT_SETTINGS;
    }
}

export async function getNsfwSettings(chatId: string): Promise<{
    modohorny: boolean;
    nsfw_horario: string | null;
}> {
    const row = await repositories.groupSettings.findNsfwSettings(chatId);
    return row ?? {modohorny: false, nsfw_horario: null};
}

export async function getGroupSettings(chatId: string) {
    const cached = getCachedFullGroupSettings<Awaited<ReturnType<typeof repositories.groupSettings.findByGroupId>>>(chatId);
    if (cached) return cached;

    const settings = await repositories.groupSettings.findByGroupId(chatId);
    if (settings) setCachedFullGroupSettings(chatId, settings);
    return settings;
}

export async function setGroupBooleanFlag(chatId: string, flag: string, value: boolean): Promise<void> {
    await repositories.groupSettings.setBooleanFlag(chatId, flag, value);
    invalidateGroupSettings(chatId);
}

export async function setGroupAutoAcceptMode(chatId: string, mode: AutoAcceptMode): Promise<void> {
    await repositories.groupSettings.setAutoAcceptMode(chatId, mode || 'off');
    invalidateGroupSettings(chatId);
}

export async function setGroupTextMessage(
    chatId: string,
    type: 'welcome' | 'bye' | 'promote' | 'demote',
    text: string,
    photoMode?: boolean,
    options?: { registeredBy?: string; hidetag?: boolean; groupPhoto?: boolean },
): Promise<void> {
    await repositories.groupSettings.setTextMessage({groupId: chatId, type, text, photoMode, ...options});
    invalidateGroupSettings(chatId);
}

export async function setNsfwSchedule(chatId: string, schedule: string): Promise<void> {
    await repositories.groupSettings.setNsfwSchedule(chatId, schedule);
    invalidateGroupSettings(chatId);
}

export async function setGroupBanned(chatId: string, banned: boolean): Promise<void> {
    await repositories.groupSettings.setBanned(chatId, banned);
    invalidateGroupSettings(chatId);
}

export async function setPrimaryBot(chatId: string, botId: string | null): Promise<void> {
    await repositories.groupSettings.setPrimaryBot(chatId, botId);
    invalidateGroupSettings(chatId);
}

export async function setGroupExpiration(chatId: string, expiresAt: number): Promise<void> {
    await repositories.groupSettings.setExpiration(chatId, expiresAt);
    invalidateGroupSettings(chatId);
}

export async function setAutorespondPrompt(chatId: string, prompt: string | null): Promise<void> {
    await repositories.groupSettings.setAutorespondPrompt(chatId, prompt);
    invalidateGroupSettings(chatId);
}

export async function setMemoryTtl(chatId: string, seconds: number): Promise<void> {
    await repositories.groupSettings.setMemoryTtl(chatId, seconds);
    invalidateGroupSettings(chatId);
}

export async function listBannedGroups(): Promise<string[]> {
    return repositories.groupSettings.listBannedGroups();
}

export function clearPrimaryBot(chatId: string): void {
    repositories.groupSettings.clearPrimaryBot(chatId)
        .then(() => invalidateGroupSettings(chatId))
        .catch(console.error);
}
