import type {Guard} from '../types/guard.js';

/** Verifica si el comando requiere admin o botAdmin. */
export const adminGuard: Guard = async ({ctx, plugin}) => {
    if (plugin.admin && !ctx.isAdmin) {
        return "🤨 No eres admins. Solo los admins pueden usar este comando.";
    }
    if (plugin.botAdmin && !ctx.isBotAdmin) {
        return `⚠️ haz admin al Bot "YO" para poder usar este comando.`;
    }
    return null;
};
