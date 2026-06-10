/**
 * Guard Pipeline.
 * Ejecuta guards en orden. Se detiene en el primer rechazo.
 * El orden importa: mode y ban cortan rápido, recursos al final.
 */
import type {Guard, GuardContext} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';
import {modeGuard} from './mode.guard.js';
import {banGuard} from './ban.guard.js';
import {nsfwGuard} from './nsfw.guard.js';
import {ownerGuard} from './owner.guard.js';
import {adminGuard} from './admin.guard.js';
import {scopeGuard} from './scope.guard.js';
import {resourceGuard} from './resource.guard.js';
import {adminModeGuard} from './admin-mode.guard.js';
import {featureAccessGuard} from './feature-access.guard.js';

const guards: Guard[] = [
    modeGuard,
    banGuard,
    nsfwGuard,
    ownerGuard,
    adminGuard,
    scopeGuard,
    featureAccessGuard,
    resourceGuard,
    adminModeGuard,
];

export interface GuardResult {
    /** null = pasó todos los guards */
    error: string | null;
    /** true si el rechazo es silencioso (no enviar mensaje al usuario) */
    silent: boolean;
}

/**
 * Ejecuta la cadena de guards. Retorna el resultado del primer rechazo,
 * o `{ error: null, silent: false }` si todos pasan.
 */
export async function runGuards(gctx: GuardContext): Promise<GuardResult> {
    for (const guard of guards) {
        const result = await guard(gctx);
        if (result === null) continue;
        if (result === SILENT_REJECT) return {error: null, silent: true};
        return {error: result as string, silent: false};
    }
    return {error: null, silent: false};
}
