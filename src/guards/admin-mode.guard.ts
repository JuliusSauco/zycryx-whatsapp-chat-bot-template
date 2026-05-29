import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';

/** Si el grupo tiene modoAdmin activo, solo admins y owners pueden usar comandos. */
export const adminModeGuard: Guard = async ({ctx}) => {
    if (ctx.modoAdminActivo && !ctx.isAdmin && !ctx.isOwner) {
        return SILENT_REJECT;
    }
    return null;
};
