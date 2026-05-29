import type {Guard} from '../types/guard.js';

/** Verifica si el comando está restringido a grupo o privado. */
export const scopeGuard: Guard = async ({ctx, plugin}) => {
    if (plugin.group && !ctx.isGroup) {
        return "⚠️ Estos es un grupo?, este comando solo funciona el grupo";
    }
    if (plugin.private && ctx.isGroup) {
        return "⚠️ Este comando solo funciona el pv";
    }
    return null;
};
