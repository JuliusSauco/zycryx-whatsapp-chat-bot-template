import {and, eq, lt, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {groupCommandAccessRules, groupSettings} from '../../db/schema.js';
import type {GroupSettingsRepository} from '../../ports/repositories.js';
import {
    mapContextGroupSettings,
    mapGroupSettings,
    mapNsfwGroupSettings,
    normalizeAccessMode,
    normalizeAutoresponderTrigger,
    normalizeBotAccessMode,
} from './group-settings.mapper.js';
import {isConfigurableFeature, mergeFamilyAccessRules, normalizeFamilyAccessMode} from '../../utils/family-access.js';

async function listFamilyRules(groupId: string) {
    const rows = await orm.select({
        target: groupCommandAccessRules.target,
        enabled: groupCommandAccessRules.enabled,
        accessMode: groupCommandAccessRules.accessMode,
    }).from(groupCommandAccessRules).where(and(
        eq(groupCommandAccessRules.groupId, groupId),
        eq(groupCommandAccessRules.scope, 'family'),
    ));
    return rows.filter(row => isConfigurableFeature(row.target)).map(row => ({
        target: row.target as import('../../domain/groups.js').ConfigurableFeatureKey,
        rule: {enabled: row.enabled, accessMode: normalizeFamilyAccessMode(row.accessMode)},
    }));
}

async function listCommandRules(groupId: string) {
    const rows = await orm.select({
        target: groupCommandAccessRules.target,
        enabled: groupCommandAccessRules.enabled,
        accessMode: groupCommandAccessRules.accessMode,
    }).from(groupCommandAccessRules).where(and(
        eq(groupCommandAccessRules.groupId, groupId),
        eq(groupCommandAccessRules.scope, 'command'),
    ));
    return rows.map(row => ({
        target: row.target,
        rule: {enabled: row.enabled, accessMode: normalizeFamilyAccessMode(row.accessMode)},
    }));
}

async function upsertFamilyRule(groupId: string, feature: import('../../domain/groups.js').ConfigurableFeatureKey, enabled: boolean, accessMode: import('../../types/config.js').AccessMode) {
    const updatedAt = new Date();
    await orm.insert(groupCommandAccessRules).values({groupId, scope: 'family', target: feature, enabled, accessMode, updatedAt})
        .onConflictDoUpdate({
            target: [groupCommandAccessRules.groupId, groupCommandAccessRules.scope, groupCommandAccessRules.target],
            set: {enabled, accessMode, updatedAt},
        });
}

async function upsertCommandRule(groupId: string, command: string, enabled: boolean, accessMode: import('../../types/config.js').AccessMode) {
    const updatedAt = new Date();
    await orm.insert(groupCommandAccessRules).values({groupId, scope: 'command', target: command, enabled, accessMode, updatedAt})
        .onConflictDoUpdate({
            target: [groupCommandAccessRules.groupId, groupCommandAccessRules.scope, groupCommandAccessRules.target],
            set: {enabled, accessMode, updatedAt},
        });
}

export const groupSettingsRepository: GroupSettingsRepository = {
    async findByGroupId(groupId) {
        const [row] = await orm.select().from(groupSettings).where(eq(groupSettings.groupId, groupId)).limit(1);
        return row ? mapGroupSettings(row) : null;
    },

    async findContextSettings(groupId) {
        const [[row], familyRules, commandRules] = await Promise.all([orm
            .select({
                banned: groupSettings.banned,
                primaryBot: groupSettings.primaryBot,
                modoadmin: groupSettings.modoadmin,
                botAccessMode: groupSettings.botAccessMode,
                antifake: groupSettings.antifake,
                messageLogging: groupSettings.messageLogging,
                antilink: groupSettings.antilink,
                antilink2: groupSettings.antilink2,
                virusTotal: groupSettings.virusTotal,
                autoresponder: groupSettings.autoresponder,
                autoresponderMode: groupSettings.autoresponderMode,
                autoresponderTrigger: groupSettings.autoresponderTrigger,
                gamesAccessMode: groupSettings.gamesAccessMode,
                toolsAccessMode: groupSettings.toolsAccessMode,
                rpgAccessMode: groupSettings.rpgAccessMode,
                downloadsAccessMode: groupSettings.downloadsAccessMode,
                searchAccessMode: groupSettings.searchAccessMode,
                stickersAccessMode: groupSettings.stickersAccessMode,
                convertersAccessMode: groupSettings.convertersAccessMode,
                funAccessMode: groupSettings.funAccessMode,
                modohorny: groupSettings.modohorny,
                nsfwAccessMode: groupSettings.nsfwAccessMode,
                nsfwGifEnabled: groupSettings.nsfwGifEnabled,
                nsfwGifAccessMode: groupSettings.nsfwGifAccessMode,
                nsfwHorario: groupSettings.nsfwHorario,
                audios: groupSettings.audios,
                autolevelup: groupSettings.autolevelup,
            })
            .from(groupSettings)
            .where(eq(groupSettings.groupId, groupId))
            .limit(1), listFamilyRules(groupId), listCommandRules(groupId)]);

        return row ? {
            ...mapContextGroupSettings(row),
            familyAccess: mergeFamilyAccessRules(familyRules),
            commandAccess: Object.fromEntries(commandRules.map(item => [item.target, item.rule])),
        } : null;
    },

    async findNsfwSettings(groupId) {
        const [[row], familyRules] = await Promise.all([orm
            .select({
                modohorny: groupSettings.modohorny,
                nsfwAccessMode: groupSettings.nsfwAccessMode,
                nsfwGifEnabled: groupSettings.nsfwGifEnabled,
                nsfwGifAccessMode: groupSettings.nsfwGifAccessMode,
                nsfwHorario: groupSettings.nsfwHorario,
            })
            .from(groupSettings)
            .where(eq(groupSettings.groupId, groupId))
            .limit(1), listFamilyRules(groupId)]);

        if (!row) return null;
        const mapped = mapNsfwGroupSettings(row);
        const access = mergeFamilyAccessRules(familyRules);
        return {...mapped,
            modohorny: access.nsfw.enabled,
            nsfwAccessMode: access.nsfw.accessMode,
            nsfwGifEnabled: access['nsfw-gifs'].enabled,
            nsfwGifAccessMode: access['nsfw-gifs'].accessMode,
        };
    },

    async setBooleanFlag(groupId, flag, value) {
        const columns = {
            welcome: groupSettings.welcome,
            bye: groupSettings.bye,
            detect: groupSettings.detect,
            antilink: groupSettings.antilink,
            antilink2: groupSettings.antilink2,
            virusTotal: groupSettings.virusTotal,
            autoresponder: groupSettings.autoresponder,
            antiporn: groupSettings.antiporn,
            audios: groupSettings.audios,
            antifake: groupSettings.antifake,
            modohorny: groupSettings.modohorny,
            modoadmin: groupSettings.modoadmin,
            messageLogging: groupSettings.messageLogging,
            welcomeHidetag: groupSettings.welcomeHidetag,
            byeHidetag: groupSettings.byeHidetag,
        } as const;
        const column = columns[flag as keyof typeof columns];
        if (!column) throw new Error(`Flag de group_settings no soportado: ${flag}`);

        await orm.insert(groupSettings)
            .values({groupId, [flag]: value})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {[flag]: value},
            });
    },

    async setAutoAcceptMode(groupId, mode) {
        await orm.insert(groupSettings)
            .values({groupId, autoAcceptMode: mode || 'off'})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {autoAcceptMode: mode || 'off'},
            });
    },

    async setBotAccessMode(groupId, mode) {
        const normalizedMode = normalizeBotAccessMode(mode || null, false);
        await orm.insert(groupSettings)
            .values({groupId, botAccessMode: normalizedMode, modoadmin: normalizedMode === 'admin'})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {botAccessMode: normalizedMode, modoadmin: normalizedMode === 'admin'},
            });
    },

    async setAutoresponderMode(groupId, enabled, mode) {
        const normalizedMode = normalizeAccessMode(mode || null);
        await orm.insert(groupSettings)
            .values({groupId, autoresponder: enabled, autoresponderMode: normalizedMode})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {autoresponder: enabled, autoresponderMode: normalizedMode},
            });
    },

    async setAutoresponderTrigger(groupId, trigger) {
        const normalizedTrigger = normalizeAutoresponderTrigger(trigger || null);
        await orm.insert(groupSettings)
            .values({groupId, autoresponderTrigger: normalizedTrigger})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {autoresponderTrigger: normalizedTrigger},
            });
    },

    async setNsfwMode(groupId, enabled, mode) {
        const normalizedMode = normalizeAccessMode(mode || null);
        await orm.insert(groupSettings)
            .values({groupId, modohorny: enabled, nsfwAccessMode: normalizedMode})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {modohorny: enabled, nsfwAccessMode: normalizedMode},
            });
        await upsertFamilyRule(groupId, 'nsfw', enabled, normalizedMode);
    },

    async setNsfwGifMode(groupId, enabled, mode) {
        const normalizedMode = normalizeAccessMode(mode || null, 'owner');
        await orm.insert(groupSettings)
            .values({groupId, nsfwGifEnabled: enabled, nsfwGifAccessMode: normalizedMode})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {nsfwGifEnabled: enabled, nsfwGifAccessMode: normalizedMode},
            });
        await upsertFamilyRule(groupId, 'nsfw-gifs', enabled, normalizedMode);
    },

    async listFamilyAccessRules(groupId) {
        return listFamilyRules(groupId);
    },

    async upsertFamilyAccessRule(groupId, feature, rule) {
        await upsertFamilyRule(groupId, feature, rule.enabled, rule.accessMode);
    },

    async listCommandAccessRules(groupId) {
        return listCommandRules(groupId);
    },

    async upsertCommandAccessRule(groupId, command, rule) {
        await upsertCommandRule(groupId, command, rule.enabled, rule.accessMode);
    },

    async setGreetingHidetagMode(groupId, type, mode) {
        const normalizedMode = mode || 'off';
        const isAllMode = normalizedMode === 'all';
        const values = type === 'welcome'
            ? {welcomeHidetagMode: normalizedMode, welcomeHidetag: isAllMode}
            : {byeHidetagMode: normalizedMode, byeHidetag: isAllMode};

        await orm.insert(groupSettings)
            .values({groupId, ...values})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: values,
            });
    },

    async setTextMessage({groupId, type, text, photoMode, registeredBy, groupPhoto}) {
        const textPropertyByType = {
            welcome: 'sWelcome',
            bye: 'sBye',
            promote: 'sPromote',
            demote: 'sDemote',
        } as const;
        const photoPropertyByType = {
            welcome: 'photowelcome',
            bye: 'photobye',
        } as const;

        const textProperty = textPropertyByType[type];
        const values: Record<string, string | boolean> = {[textProperty]: text};
        const updates: Record<string, string | boolean> = {[textProperty]: text};

        if ((type === 'welcome' || type === 'bye') && typeof photoMode === 'boolean') {
            const photoProperty = photoPropertyByType[type];
            values[photoProperty] = photoMode;
            updates[photoProperty] = photoMode;
        }
        if (type === 'welcome') {
            if (registeredBy) {
                values.welcomeRegisteredBy = registeredBy;
                updates.welcomeRegisteredBy = registeredBy;
            }
            if (typeof groupPhoto === 'boolean') {
                values.welcomeGroupPhoto = groupPhoto;
                updates.welcomeGroupPhoto = groupPhoto;
            }
        }
        if (type === 'bye') {
            if (registeredBy) {
                values.byeRegisteredBy = registeredBy;
                updates.byeRegisteredBy = registeredBy;
            }
            if (typeof groupPhoto === 'boolean') {
                values.byeGroupPhoto = groupPhoto;
                updates.byeGroupPhoto = groupPhoto;
            }
        }

        await orm.insert(groupSettings)
            .values({groupId, ...values})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: updates,
            });
    },

    async setNsfwSchedule(groupId, schedule) {
        await orm.insert(groupSettings)
            .values({groupId, nsfwHorario: schedule})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {nsfwHorario: schedule},
            });
    },

    async setBanned(groupId, banned) {
        await orm.insert(groupSettings)
            .values({groupId, banned})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {banned},
            });
    },

    async setPrimaryBot(groupId, botId) {
        await orm.insert(groupSettings)
            .values({groupId, primaryBot: botId})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {primaryBot: botId},
            });
    },

    async setExpiration(groupId, expiresAt) {
        await orm.insert(groupSettings)
            .values({groupId, expired: expiresAt})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {expired: expiresAt},
            });
    },

    async setAutorespondPrompt(groupId, prompt) {
        await orm.insert(groupSettings)
            .values({groupId, sAutorespond: prompt})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {sAutorespond: prompt},
            });
    },

    async setMemoryTtl(groupId, seconds) {
        await orm.insert(groupSettings)
            .values({groupId, memoryTtl: seconds})
            .onConflictDoUpdate({
                target: groupSettings.groupId,
                set: {memoryTtl: seconds},
            });
    },

    async listBannedGroups() {
        const rows = await orm
            .select({group_id: groupSettings.groupId})
            .from(groupSettings)
            .where(eq(groupSettings.banned, true));

        return rows.map(row => row.group_id);
    },

    async listExpiredGroups(now) {
        const rows = await orm
            .select({
                group_id: groupSettings.groupId,
                expired: groupSettings.expired,
            })
            .from(groupSettings)
            .where(and(
                sql`${groupSettings.expired} IS NOT NULL`,
                sql`${groupSettings.expired} > 0`,
                lt(groupSettings.expired, now),
            ));

        return rows.map(row => ({
            group_id: row.group_id,
            expired: row.expired ?? 0,
        }));
    },

    async clearExpiration(groupId) {
        await orm.update(groupSettings)
            .set({expired: null})
            .where(eq(groupSettings.groupId, groupId));
    },

    async clearPrimaryBot(groupId) {
        await orm.update(groupSettings)
            .set({primaryBot: null})
            .where(eq(groupSettings.groupId, groupId));
    },
};
