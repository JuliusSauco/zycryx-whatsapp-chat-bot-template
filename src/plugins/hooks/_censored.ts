import {findGroupCensoredUser} from '../../services/censored-user.service.js';
import {logError} from '../../lib/logger.js';
import type {PluginInterceptor} from '../../types/plugin.js';
import {CENSORED_COMMAND_ACCESS_KEY, defaultCommandAccess} from '../../utils/command-access.js';
import {isCensoredTargetCurrentlyPrivileged, resolveCensoredTarget} from '../../utils/censored-user.js';

type MessageKeyWithAlt = {participantAlt?: string | null};

export const interceptors: PluginInterceptor[] = [{
    phase: 'security',
    priority: 1000,
    appliesTo: 'all',
    failurePolicy: 'fail-open',
    async run(m, ctx) {
        if (!ctx.isGroup || m.fromMe || !m.sender) return {kind: 'continue'};
        const rule = ctx.groupSettings.commandAccess?.[CENSORED_COMMAND_ACCESS_KEY]
            || defaultCommandAccess(CENSORED_COMMAND_ACCESS_KEY);
        if (!rule.enabled || !ctx.isBotAdmin) return {kind: 'continue'};

        let record;
        try {
            record = await findGroupCensoredUser(ctx.chatId, [m.sender, m.lid]);
        } catch (error: unknown) {
            logError('No se pudo consultar la censura del grupo:', error);
            return {kind: 'continue'};
        }
        if (!record) return {kind: 'continue'};

        const target = resolveCensoredTarget(record.user_id || record.user_lid || m.sender, ctx.participants);
        if (isCensoredTargetCurrentlyPrivileged({
            target: {...target, userLid: record.user_lid || target.userLid},
            chatId: ctx.chatId,
            metadata: ctx.metadata,
            botConfig: ctx.botConfig,
        })) return {kind: 'continue'};

        const keyWithAlt = m.key as typeof m.key & MessageKeyWithAlt;
        const participant = keyWithAlt.participantAlt || m.key.participant || m.sender;
        try {
            await ctx.conn.sendMessage(ctx.chatId, {delete: {...m.key, participant}});
        } catch (error: unknown) {
            logError('No se pudo eliminar un mensaje censurado:', error);
        }
        return {kind: 'handled'};
    },
}];
