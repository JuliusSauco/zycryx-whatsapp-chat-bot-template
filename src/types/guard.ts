import type {HandlerContext} from '../core/context-builder.js';
import type {Plugin} from './plugin.js';

export interface GuardContext {
    m: any;
    conn: any;
    ctx: HandlerContext;
    plugin: Plugin;
}

/**
 * Un Guard evalúa si un comando puede ejecutarse.
 * Retorna `null` si pasa, un `string` con el mensaje de rechazo,
 * o el símbolo SILENT_REJECT para rechazar sin enviar mensaje al usuario.
 */
export type Guard = (gctx: GuardContext) => Promise<string | symbol | null>;

/** Símbolo para rechazos silenciosos (sin mensaje al usuario). */
export const SILENT_REJECT = Symbol('SILENT_REJECT');
