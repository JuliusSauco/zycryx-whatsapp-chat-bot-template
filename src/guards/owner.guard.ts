import type {Guard} from '../types/guard.js';

/** Verifica si el comando requiere ser owner del bot. */
export const ownerGuard: Guard = async ({ctx, plugin}) => {
    if (plugin.owner && !ctx.isOwner) {
        return "⚠️ Tu que? no eres mi propietario para venir a dame orden 🙄, solo el dueño del sub-bot o el owner puede usar este comando.";
    }
    return null;
};
