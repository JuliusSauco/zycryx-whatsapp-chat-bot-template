import type {Guard} from '../types/guard.js';
import {consumeCommandResources} from '../services/resource.service.js';

/** Verifica y descuenta recursos: limit (diamantes), money (lolicoins) y level. */
export const resourceGuard: Guard = async ({m, ctx, plugin}) => {
    return consumeCommandResources(ctx.sender, plugin, m);
};
