import type {Guard} from '../types/guard.js';
import {accessModeLabel, canUseAccessMode} from '../utils/access-mode.js';

export const commandAccessGuard: Guard = async ({ctx, plugin}) => {
    if (!ctx.isGroup || !plugin.commandAccess) return null;
    const {key, defaultRule} = plugin.commandAccess;
    const rule = ctx.groupSettings.commandAccess?.[key] || defaultRule;
    if (!rule.enabled) return `⛔ El comando *${key}* está desactivado en este grupo.`;
    if (canUseAccessMode(rule.accessMode, ctx)) return null;
    return `🔐 El comando *${key}* está disponible para: *${accessModeLabel(rule.accessMode)}*.`;
};
