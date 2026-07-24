import type {Guard} from '../types/guard.js';
import {canUseAccessMode} from '../utils/access-mode.js';
import {accessModeLabel} from '../utils/access-mode.js';
import {defaultFamilyAccess, familyAccessLabel} from '../utils/family-access.js';

export const featureAccessGuard: Guard = async ({ctx, plugin}) => {
    if (!ctx.isGroup) return null;

    const feature = plugin.feature;
    if (!feature || plugin.owner || plugin.admin || plugin.botAdmin) return null;

    const rule = ctx.groupSettings.familyAccess?.[feature] || defaultFamilyAccess(feature);
    const label = familyAccessLabel(feature);
    if (!rule.enabled) return `⛔ La familia *${label}* está desactivada en este grupo.`;
    if (canUseAccessMode(rule.accessMode, ctx)) return null;
    return `🔐 La familia *${label}* está disponible para: *${accessModeLabel(rule.accessMode)}*.`;
};
