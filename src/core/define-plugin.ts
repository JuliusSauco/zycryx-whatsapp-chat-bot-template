/**
 * Factory para definir plugins con tipado completo.
 * Compatible hacia atrás con el patrón actual (función con propiedades).
 *
 * Uso:
 *   import { definePlugin } from '../core/define-plugin.js';
 *
 *   export default definePlugin({
 *     command: ['ping', 'p'],
 *     help: ['ping'],
 *     tags: ['main'],
 *     async execute(m, ctx) {
 *       await m.reply('pong!');
 *     }
 *   });
 */
import type {PluginContext} from '../types/context.js';
import type {BotMessage} from '../types/message.js';
import type {Plugin} from '../types/plugin.js';

export interface PluginDefinition {
    /** Comando(s) que activan el plugin. */
    command?: string | string[] | RegExp;
    /** Prefijo custom (para comandos como `=> code`). */
    customPrefix?: RegExp | ((input: string) => boolean);
    /** Textos de ayuda mostrados en el menú. */
    help?: string[];
    /** Categorías/tags para el menú. */
    tags?: string[];
    /** Requiere ser owner del bot. */
    owner?: boolean;
    /** Requiere ser owner real (fixed owners). */
    rowner?: boolean;
    /** Requiere ser admin del grupo. */
    admin?: boolean;
    /** Requiere que el bot sea admin del grupo. */
    botAdmin?: boolean;
    /** Solo funciona en grupos. */
    group?: boolean;
    /** Solo funciona en chat privado. */
    private?: boolean;
    /** Requiere estar registrado. */
    register?: boolean;
    /** Costo en diamantes (limit). */
    limit?: number;
    /** Costo en lolicoins. */
    money?: number;
    /** Nivel mínimo requerido. */
    level?: number;
    /** Permite que `before` corra también cuando el mensaje es un comando con prefijo. */
    runBeforeOnCommand?: boolean;
    /** Hook que se ejecuta ANTES de cualquier comando (para middlewares como antilink). */
    before?: (m: BotMessage, ctx: Pick<PluginContext, 'conn' | 'isOwner'>) => Promise<boolean | void | unknown>;
    /** Lógica principal del plugin. */
    execute: (m: BotMessage, ctx: PluginContext) => Promise<unknown>;
}

/**
 * Crea un plugin con tipado completo.
 * El resultado es compatible con el sistema de plugins existente
 * (función callable con propiedades de metadata).
 */
export function definePlugin(def: PluginDefinition): Plugin {
    // La función principal es `execute`, que se vuelve el callable del plugin
    const fn = def.execute as unknown as Plugin;

    // Copiar todas las propiedades de metadata al objeto función
    if (def.command !== undefined) fn.command = def.command;
    if (def.customPrefix !== undefined) fn.customPrefix = def.customPrefix;
    if (def.help !== undefined) fn.help = def.help;
    if (def.tags !== undefined) fn.tags = def.tags;
    if (def.owner !== undefined) fn.owner = def.owner;
    if (def.rowner !== undefined) fn.rowner = def.rowner;
    if (def.admin !== undefined) fn.admin = def.admin;
    if (def.botAdmin !== undefined) fn.botAdmin = def.botAdmin;
    if (def.group !== undefined) fn.group = def.group;
    if (def.private !== undefined) fn.private = def.private;
    if (def.register !== undefined) fn.register = def.register;
    if (def.limit !== undefined) fn.limit = def.limit;
    if (def.money !== undefined) fn.money = def.money;
    if (def.level !== undefined) fn.level = def.level;
    if (def.runBeforeOnCommand !== undefined) fn.runBeforeOnCommand = def.runBeforeOnCommand;
    if (def.before) fn.before = def.before;

    return fn;
}
