import type {Guard} from '../types/guard.js';
import {checkCommandResources} from '../services/resource.service.js';

/** Verifica recursos sin efectos secundarios. La reserva ocurre después de aprobar todos los guards. */
export const resourceGuard: Guard = async ({ctx, plugin}) => {
    return checkCommandResources(ctx.sender, plugin);
};
