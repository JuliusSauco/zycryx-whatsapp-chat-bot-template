import type {Guard} from '../types/guard.js';

/** Verifica si el comando requiere owner o rowner. */
export const ownerGuard: Guard = async ({ctx, plugin}) => {
    if (plugin.owner && !ctx.isOwner) {
        return "⚠️ Tu que? no eres mi propietario para venir a dame orden 🙄, solo el dueño del sub-bot o el owner puede usar este comando.";
    }
    if (plugin.rowner && !ctx.isROwner) {
        return "⚠️ Tu que? no eres mi propietario para venir a dame orden 🙄.";
    }
    return null;
};
