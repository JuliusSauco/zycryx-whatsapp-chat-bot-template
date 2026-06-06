import {and, eq, lt, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {groupSettings} from '../../db/schema.js';
import type {GroupSettingsRepository} from '../../ports/repositories.js';
import type {AutoAcceptMode} from '../../types/config.js';

export const groupSettingsRepository: GroupSettingsRepository = {
    async findByGroupId(groupId) {
        const [row] = await orm.select().from(groupSettings).where(eq(groupSettings.groupId, groupId)).limit(1);
        if (!row) return null;

        return {
            group_id: row.groupId,
            welcomeConfigId: row.welcomeConfigId,
            welcome: row.welcome ?? true,
            detect: row.detect ?? true,
            antifake: row.antifake ?? false,
            antilink: row.antilink ?? false,
            antilink2: row.antilink2 ?? false,
            virusTotal: row.virusTotal ?? false,
            modohorny: row.modohorny ?? false,
            audios: row.audios ?? false,
            antiStatus: row.antiStatus ?? false,
            modoadmin: row.modoadmin ?? false,
            photowelcome: row.photowelcome ?? true,
            welcomeRegisteredBy: row.welcomeRegisteredBy,
            welcomeHidetag: row.welcomeHidetag ?? false,
            welcomeGroupPhoto: row.welcomeGroupPhoto ?? false,
            byeConfigId: row.byeConfigId,
            byeRegisteredBy: row.byeRegisteredBy,
            byeHidetag: row.byeHidetag ?? false,
            byeGroupPhoto: row.byeGroupPhoto ?? false,
            photobye: row.photobye ?? true,
            autolevelup: row.autolevelup ?? true,
            nsfw_horario: row.nsfwHorario,
            sWelcome: row.sWelcome,
            sBye: row.sBye,
            sPromote: row.sPromote,
            sDemote: row.sDemote,
            sAutorespond: row.sAutorespond,
            banned: row.banned ?? false,
            expired: row.expired ?? 0,
            memory_ttl: row.memoryTtl ?? 86400,
            primary_bot: row.primaryBot,
            autoAcceptMode: (row.autoAcceptMode || 'off') as AutoAcceptMode,
            messageLogging: row.messageLogging ?? false,
        };
    },

    async findContextSettings(groupId) {
        const [row] = await orm
            .select({
                banned: groupSettings.banned,
                primary_bot: groupSettings.primaryBot,
                modoadmin: groupSettings.modoadmin,
                antifake: groupSettings.antifake,
                message_logging: groupSettings.messageLogging,
                antilink: groupSettings.antilink,
                antilink2: groupSettings.antilink2,
                virusTotal: groupSettings.virusTotal,
                audios: groupSettings.audios,
                autolevelup: groupSettings.autolevelup,
            })
            .from(groupSettings)
            .where(eq(groupSettings.groupId, groupId))
            .limit(1);

        return row
            ? {
                banned: !!row.banned,
                primary_bot: row.primary_bot ?? null,
                modoadmin: !!row.modoadmin,
                antifake: !!row.antifake,
                message_logging: !!row.message_logging,
                antilink: !!row.antilink,
                antilink2: !!row.antilink2,
                virusTotal: !!row.virusTotal,
                audios: !!row.audios,
                autolevelup: row.autolevelup ?? true,
            }
            : null;
    },

    async findNsfwSettings(groupId) {
        const [row] = await orm
            .select({
                modohorny: groupSettings.modohorny,
                nsfw_horario: groupSettings.nsfwHorario,
            })
            .from(groupSettings)
            .where(eq(groupSettings.groupId, groupId))
            .limit(1);

        return row
            ? {
                modohorny: !!row.modohorny,
                nsfw_horario: row.nsfw_horario ?? null,
            }
            : null;
    },

    async setBooleanFlag(groupId, flag, value) {
        const columns = {
            welcome: groupSettings.welcome,
            detect: groupSettings.detect,
            antilink: groupSettings.antilink,
            antilink2: groupSettings.antilink2,
            virusTotal: groupSettings.virusTotal,
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

    async setTextMessage({groupId, type, text, photoMode, registeredBy, hidetag, groupPhoto}) {
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
            if (typeof hidetag === 'boolean') {
                values.welcomeHidetag = hidetag;
                updates.welcomeHidetag = hidetag;
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
            if (typeof hidetag === 'boolean') {
                values.byeHidetag = hidetag;
                updates.byeHidetag = hidetag;
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
