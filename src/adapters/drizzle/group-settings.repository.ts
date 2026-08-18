import {and, eq, lt} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    groupAutoresponderSettings,
    groupCommandAccessRules,
    groupGreetings,
    groupMemorySettings,
    groupModerationSettings,
    groupNsfwSettings,
    groupRpgSettings,
    groupSettings,
    usuarios,
} from '../../db/schema.js';
import type {ConfigurableFeatureKey} from '../../domain/groups.js';
import type {GroupSettingsRepository} from '../../ports/repositories.js';
import type {AccessMode} from '../../types/config.js';
import {defaultFamilyAccess, isConfigurableFeature, mergeFamilyAccessRules, normalizeFamilyAccessMode} from '../../utils/family-access.js';
import {
    mapContextGroupSettings,
    mapGroupSettings,
    mapNsfwGroupSettings,
    normalizeAccessMode,
    normalizeAutoresponderTrigger,
    normalizeBotAccessMode,
    type GroupSettingsRow,
} from './group-settings.mapper.js';

type Transaction = Parameters<Parameters<typeof orm.transaction>[0]>[0];

async function ensureGroup(tx: Transaction, groupId: string): Promise<void> {
    await tx.insert(groupSettings).values({groupId}).onConflictDoNothing();
}

async function listFamilyRules(groupId: string) {
    const rows = await orm.select({
        target: groupCommandAccessRules.target,
        enabled: groupCommandAccessRules.enabled,
        accessMode: groupCommandAccessRules.accessMode,
    }).from(groupCommandAccessRules).where(and(
        eq(groupCommandAccessRules.groupId, groupId), eq(groupCommandAccessRules.scope, 'family'),
    ));
    return rows.filter(row => isConfigurableFeature(row.target)).map(row => ({
        target: row.target as ConfigurableFeatureKey,
        rule: {enabled: row.enabled, accessMode: normalizeFamilyAccessMode(row.accessMode)},
    }));
}

async function listCommandRules(groupId: string) {
    const rows = await orm.select({
        target: groupCommandAccessRules.target,
        enabled: groupCommandAccessRules.enabled,
        accessMode: groupCommandAccessRules.accessMode,
    }).from(groupCommandAccessRules).where(and(
        eq(groupCommandAccessRules.groupId, groupId), eq(groupCommandAccessRules.scope, 'command'),
    ));
    return rows.map(row => ({
        target: row.target,
        rule: {enabled: row.enabled, accessMode: normalizeFamilyAccessMode(row.accessMode)},
    }));
}

async function upsertFamilyRule(groupId: string, feature: ConfigurableFeatureKey, enabled: boolean, accessMode: AccessMode) {
    const fallback = defaultFamilyAccess(feature);
    await orm.transaction(async tx => {
        await ensureGroup(tx, groupId);
        if (enabled === fallback.enabled && accessMode === fallback.accessMode) {
            await tx.delete(groupCommandAccessRules).where(and(
                eq(groupCommandAccessRules.groupId, groupId),
                eq(groupCommandAccessRules.scope, 'family'),
                eq(groupCommandAccessRules.target, feature),
            ));
            return;
        }
        await tx.insert(groupCommandAccessRules).values({groupId, scope: 'family', target: feature, enabled, accessMode})
            .onConflictDoUpdate({
                target: [groupCommandAccessRules.groupId, groupCommandAccessRules.scope, groupCommandAccessRules.target],
                set: {enabled, accessMode, updatedAt: new Date()},
            });
    });
}

async function loadRow(groupId: string): Promise<{row: GroupSettingsRow; familyRules: Awaited<ReturnType<typeof listFamilyRules>>; commandRules: Awaited<ReturnType<typeof listCommandRules>>} | null> {
    const [[core], [moderation], [autoresponder], [nsfw], [memory], [rpg], greetings, familyRules, commandRules] = await Promise.all([
        orm.select().from(groupSettings).where(eq(groupSettings.groupId, groupId)).limit(1),
        orm.select().from(groupModerationSettings).where(eq(groupModerationSettings.groupId, groupId)).limit(1),
        orm.select().from(groupAutoresponderSettings).where(eq(groupAutoresponderSettings.groupId, groupId)).limit(1),
        orm.select().from(groupNsfwSettings).where(eq(groupNsfwSettings.groupId, groupId)).limit(1),
        orm.select().from(groupMemorySettings).where(eq(groupMemorySettings.groupId, groupId)).limit(1),
        orm.select().from(groupRpgSettings).where(eq(groupRpgSettings.groupId, groupId)).limit(1),
        orm.select().from(groupGreetings).where(eq(groupGreetings.groupId, groupId)),
        listFamilyRules(groupId),
        listCommandRules(groupId),
    ]);
    if (!core) return null;
    const access = mergeFamilyAccessRules(familyRules);
    const welcome = greetings.find(item => item.eventType === 'welcome');
    const bye = greetings.find(item => item.eventType === 'bye');
    const promote = greetings.find(item => item.eventType === 'promote');
    const demote = greetings.find(item => item.eventType === 'demote');
    const row: GroupSettingsRow = {
        groupId,
        welcomeConfigId: null,
        welcome: welcome?.enabled ?? true,
        detect: moderation?.detect ?? true,
        antifake: moderation?.antifake ?? false,
        antilink: moderation?.antilink ?? false,
        antilink2: moderation?.antilink2 ?? false,
        virusTotal: moderation?.virusTotal ?? false,
        autoresponder: autoresponder?.enabled ?? true,
        autoresponderMode: autoresponder?.accessMode ?? 'all',
        autoresponderTrigger: autoresponder?.trigger ?? 'mention',
        gamesAccessMode: access.games.accessMode,
        toolsAccessMode: access.tools.accessMode,
        rpgAccessMode: access.rpg.accessMode,
        downloadsAccessMode: access.downloads.accessMode,
        searchAccessMode: access.search.accessMode,
        stickersAccessMode: access.stickers.accessMode,
        convertersAccessMode: access.converters.accessMode,
        funAccessMode: access.fun.accessMode,
        modohorny: access.nsfw.enabled,
        nsfwAccessMode: access.nsfw.accessMode,
        nsfwGifEnabled: access['nsfw-gifs'].enabled,
        nsfwGifAccessMode: access['nsfw-gifs'].accessMode,
        audios: access.audio.enabled,
        antiStatus: moderation?.antiStatus ?? false,
        modoadmin: core.botAccessMode === 'admin',
        photowelcome: welcome?.photoEnabled ?? true,
        welcomeRegisteredBy: welcome?.registeredBy ?? null,
        welcomeHidetag: welcome?.hidetagMode === 'all',
        welcomeHidetagMode: welcome?.hidetagMode ?? 'off',
        welcomeGroupPhoto: welcome?.useGroupPhoto ?? false,
        bye: bye?.enabled ?? true,
        byeConfigId: null,
        byeRegisteredBy: bye?.registeredBy ?? null,
        byeHidetag: bye?.hidetagMode === 'all',
        byeHidetagMode: bye?.hidetagMode ?? 'off',
        byeGroupPhoto: bye?.useGroupPhoto ?? false,
        photobye: bye?.photoEnabled ?? true,
        autolevelup: rpg?.autoLevelUp ?? true,
        nsfwHorario: nsfw?.schedule ?? null,
        sWelcome: welcome?.messageTemplate ?? null,
        sBye: bye?.messageTemplate ?? null,
        sPromote: promote?.messageTemplate ?? null,
        sDemote: demote?.messageTemplate ?? null,
        sAutorespond: autoresponder?.prompt ?? null,
        banned: core.banned,
        expired: core.expiresAt?.getTime() ?? 0,
        memoryTtl: memory?.ttlSeconds ?? 86400,
        primaryBot: core.primaryBot,
        autoAcceptMode: core.autoAcceptMode,
        botAccessMode: core.botAccessMode,
        messageLogging: core.messageLogging,
    };
    return {row, familyRules, commandRules};
}

export const groupSettingsRepository: GroupSettingsRepository = {
    async findByGroupId(groupId) {
        const loaded = await loadRow(groupId);
        return loaded ? mapGroupSettings(loaded.row) : null;
    },

    async findContextSettings(groupId) {
        const loaded = await loadRow(groupId);
        if (!loaded) return null;
        return {
            ...mapContextGroupSettings(loaded.row),
            familyAccess: mergeFamilyAccessRules(loaded.familyRules),
            commandAccess: Object.fromEntries(loaded.commandRules.map(item => [item.target, item.rule])),
        };
    },

    async findNsfwSettings(groupId) {
        const loaded = await loadRow(groupId);
        return loaded ? mapNsfwGroupSettings(loaded.row) : null;
    },

    async setBooleanFlag(groupId, flag, value) {
        if (flag === 'welcome' || flag === 'bye') {
            await orm.transaction(async tx => {
                await ensureGroup(tx, groupId);
                await tx.insert(groupGreetings).values({groupId, eventType: flag, enabled: value})
                    .onConflictDoUpdate({target: [groupGreetings.groupId, groupGreetings.eventType], set: {enabled: value, updatedAt: new Date()}});
            });
            return;
        }
        const moderationProperty = {
            detect: 'detect', antifake: 'antifake', antilink: 'antilink', antilink2: 'antilink2',
            virusTotal: 'virusTotal', antiporn: 'antiporn',
        } as const;
        const property = moderationProperty[flag as keyof typeof moderationProperty];
        if (property) {
            await orm.transaction(async tx => {
                await ensureGroup(tx, groupId);
                await tx.insert(groupModerationSettings).values({groupId, [property]: value})
                    .onConflictDoUpdate({target: groupModerationSettings.groupId, set: {[property]: value, updatedAt: new Date()}});
            });
            return;
        }
        if (flag === 'autoresponder') {
            await this.setAutoresponderMode(groupId, value, 'all');
            return;
        }
        if (flag === 'autolevelup') {
            await orm.transaction(async tx => {
                await ensureGroup(tx, groupId);
                await tx.insert(groupRpgSettings).values({groupId, autoLevelUp: value})
                    .onConflictDoUpdate({target: groupRpgSettings.groupId, set: {autoLevelUp: value, updatedAt: new Date()}});
            });
            return;
        }
        if (flag === 'audios') return upsertFamilyRule(groupId, 'audio', value, 'all');
        if (flag === 'modohorny') return upsertFamilyRule(groupId, 'nsfw', value, 'owner');
        if (flag === 'messageLogging') {
            await orm.insert(groupSettings).values({groupId, messageLogging: value}).onConflictDoUpdate({
                target: groupSettings.groupId, set: {messageLogging: value, updatedAt: new Date()},
            });
            return;
        }
        if (flag === 'modoadmin') return this.setBotAccessMode(groupId, value ? 'admin' : 'all');
        if (flag === 'welcomeHidetag' || flag === 'byeHidetag') {
            return this.setGreetingHidetagMode(groupId, flag === 'welcomeHidetag' ? 'welcome' : 'bye', value ? 'all' : 'off');
        }
        throw new Error(`Flag de grupo no soportado: ${flag}`);
    },

    async setAutoAcceptMode(groupId, mode) {
        await orm.insert(groupSettings).values({groupId, autoAcceptMode: mode || 'off'}).onConflictDoUpdate({
            target: groupSettings.groupId, set: {autoAcceptMode: mode || 'off', updatedAt: new Date()},
        });
    },

    async setBotAccessMode(groupId, mode) {
        const normalized = normalizeBotAccessMode(mode || null, false);
        await orm.insert(groupSettings).values({groupId, botAccessMode: normalized}).onConflictDoUpdate({
            target: groupSettings.groupId, set: {botAccessMode: normalized, updatedAt: new Date()},
        });
    },

    async setAutoresponderMode(groupId, enabled, mode) {
        const accessMode = normalizeAccessMode(mode || null);
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupAutoresponderSettings).values({groupId, enabled, accessMode}).onConflictDoUpdate({
                target: groupAutoresponderSettings.groupId, set: {enabled, accessMode, updatedAt: new Date()},
            });
        });
    },

    async setAutoresponderTrigger(groupId, trigger) {
        const normalized = normalizeAutoresponderTrigger(trigger || null);
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupAutoresponderSettings).values({groupId, trigger: normalized}).onConflictDoUpdate({
                target: groupAutoresponderSettings.groupId, set: {trigger: normalized, updatedAt: new Date()},
            });
        });
    },

    async setNsfwMode(groupId, enabled, mode) {
        await upsertFamilyRule(groupId, 'nsfw', enabled, normalizeAccessMode(mode || null, 'owner'));
    },

    async setNsfwGifMode(groupId, enabled, mode) {
        await upsertFamilyRule(groupId, 'nsfw-gifs', enabled, normalizeAccessMode(mode || null, 'owner'));
    },

    async listFamilyAccessRules(groupId) { return listFamilyRules(groupId); },

    async upsertFamilyAccessRule(groupId, feature, rule) {
        await upsertFamilyRule(groupId, feature, rule.enabled, rule.accessMode);
    },

    async listCommandAccessRules(groupId) { return listCommandRules(groupId); },

    async upsertCommandAccessRule(groupId, command, rule) {
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupCommandAccessRules).values({groupId, scope: 'command', target: command, ...rule})
                .onConflictDoUpdate({
                    target: [groupCommandAccessRules.groupId, groupCommandAccessRules.scope, groupCommandAccessRules.target],
                    set: {...rule, updatedAt: new Date()},
                });
        });
    },

    async setGreetingHidetagMode(groupId, type, mode) {
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupGreetings).values({groupId, eventType: type, hidetagMode: mode || 'off'})
                .onConflictDoUpdate({
                    target: [groupGreetings.groupId, groupGreetings.eventType],
                    set: {hidetagMode: mode || 'off', updatedAt: new Date()},
                });
        });
    },

    async setGreetingConfig(groupId, type, enabled, mode) {
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupGreetings).values({groupId, eventType: type, enabled, hidetagMode: mode || 'off'})
                .onConflictDoUpdate({
                    target: [groupGreetings.groupId, groupGreetings.eventType],
                    set: {enabled, hidetagMode: mode || 'off', updatedAt: new Date()},
                });
        });
    },

    async setTextMessage({groupId, type, text, photoMode, registeredBy, groupPhoto}) {
        const values = {
            messageTemplate: text,
            ...(typeof photoMode === 'boolean' ? {photoEnabled: photoMode} : {}),
            ...(registeredBy ? {registeredBy} : {}),
            ...(typeof groupPhoto === 'boolean' ? {useGroupPhoto: groupPhoto} : {}),
            updatedAt: new Date(),
        };
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            if (registeredBy) await tx.insert(usuarios).values({id: registeredBy}).onConflictDoNothing();
            await tx.insert(groupGreetings).values({groupId, eventType: type, ...values})
                .onConflictDoUpdate({target: [groupGreetings.groupId, groupGreetings.eventType], set: values});
        });
    },

    async setNsfwSchedule(groupId, schedule) {
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupNsfwSettings).values({groupId, schedule}).onConflictDoUpdate({
                target: groupNsfwSettings.groupId, set: {schedule, updatedAt: new Date()},
            });
        });
    },

    async setBanned(groupId, banned) {
        await orm.insert(groupSettings).values({groupId, banned}).onConflictDoUpdate({
            target: groupSettings.groupId, set: {banned, updatedAt: new Date()},
        });
    },

    async setPrimaryBot(groupId, botId) {
        await orm.insert(groupSettings).values({groupId, primaryBot: botId}).onConflictDoUpdate({
            target: groupSettings.groupId, set: {primaryBot: botId, updatedAt: new Date()},
        });
    },

    async setExpiration(groupId, expiresAt) {
        await orm.insert(groupSettings).values({groupId, expiresAt: new Date(expiresAt)}).onConflictDoUpdate({
            target: groupSettings.groupId, set: {expiresAt: new Date(expiresAt), updatedAt: new Date()},
        });
    },

    async setAutorespondPrompt(groupId, prompt) {
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupAutoresponderSettings).values({groupId, prompt}).onConflictDoUpdate({
                target: groupAutoresponderSettings.groupId, set: {prompt, updatedAt: new Date()},
            });
        });
    },

    async setMemoryTtl(groupId, seconds) {
        await orm.transaction(async tx => {
            await ensureGroup(tx, groupId);
            await tx.insert(groupMemorySettings).values({groupId, ttlSeconds: seconds}).onConflictDoUpdate({
                target: groupMemorySettings.groupId, set: {ttlSeconds: seconds, updatedAt: new Date()},
            });
        });
    },

    async listBannedGroups() {
        const rows = await orm.select({group_id: groupSettings.groupId}).from(groupSettings).where(eq(groupSettings.banned, true));
        return rows.map(row => row.group_id);
    },

    async listExpiredGroups(now) {
        const rows = await orm.select({group_id: groupSettings.groupId, expiresAt: groupSettings.expiresAt})
            .from(groupSettings).where(and(lt(groupSettings.expiresAt, new Date(now)), eq(groupSettings.banned, false)));
        return rows.map(row => ({group_id: row.group_id, expired: row.expiresAt?.getTime() ?? 0}));
    },

    async clearExpiration(groupId) {
        await orm.update(groupSettings).set({expiresAt: null, updatedAt: new Date()}).where(eq(groupSettings.groupId, groupId));
    },

    async clearPrimaryBot(groupId) {
        await orm.update(groupSettings).set({primaryBot: null, updatedAt: new Date()}).where(eq(groupSettings.groupId, groupId));
    },
};
