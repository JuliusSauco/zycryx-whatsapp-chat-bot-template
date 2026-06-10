import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';

/** Controla quien puede usar comandos en el grupo segun el modo de acceso del bot. */
export const adminModeGuard: Guard = async ({ctx}) => {
    const mode = ctx.botAccessMode || (ctx.modoAdminActivo ? 'admin' : 'all');

    switch (mode) {
        case 'owner':
            return ctx.isOwner ? null : SILENT_REJECT;
        case 'superadmin':
            return ctx.isOwner || ctx.isGroupCreator ? null : SILENT_REJECT;
        case 'admin':
            return ctx.isOwner || ctx.isAdmin ? null : SILENT_REJECT;
        default:
            return null;
    }
};
