/**
 * Command Router.
 * Resuelve qué plugin debe manejar un comando dado.
 * Usa un Map para exact match O(1) y arrays para regex/customPrefix como fallback.
 */
import type {Plugin} from '../types/plugin.js';

type CustomPrefixMatcher = RegExp | ((input: string) => boolean);

export class CommandRouter {
    private exact = new Map<string, Plugin>();
    private regex: [RegExp, Plugin][] = [];
    private customPrefixPlugins: [CustomPrefixMatcher, Plugin][] = [];
    private beforePlugins: Plugin[] = [];

    /**
     * Registra todos los plugins. Llamar cada vez que global.plugins cambia.
     * Limpia el estado anterior antes de registrar.
     */
    registerAll(plugins: Record<string, Plugin>): void {
        this.exact.clear();
        this.regex = [];
        this.customPrefixPlugins = [];
        this.beforePlugins = [];

        for (const plugin of Object.values(plugins)) {
            // Registrar before hooks
            if (typeof plugin.before === 'function') {
                this.beforePlugins.push(plugin);
            }

            const cmd = plugin.command;
            if (!cmd && !plugin.customPrefix) continue;

            // Registrar por tipo de command
            if (typeof cmd === 'string') {
                this.exact.set(cmd.toLowerCase(), plugin);
            } else if (Array.isArray(cmd)) {
                for (const c of cmd) {
                    this.exact.set(c.toLowerCase(), plugin);
                }
            } else if (cmd instanceof RegExp) {
                this.regex.push([cmd, plugin]);
            }

            // Registrar customPrefix
            if (plugin.customPrefix) {
                this.customPrefixPlugins.push([plugin.customPrefix, plugin]);
            }
        }
    }

    /**
     * Resuelve el plugin que debe manejar el comando.
     * @param command - nombre del comando en lowercase (ya sin prefijo)
     * @param rawText - texto original del mensaje (para customPrefix matching)
     * @param hasPrefix - true si el mensaje tenía un prefijo válido
     */
    resolve(command: string, rawText: string, hasPrefix: boolean): Plugin | null {
        // 1. Exact match (O(1)) — solo si hay prefijo
        if (hasPrefix && command) {
            const exact = this.exact.get(command);
            if (exact) return exact;
        }

        // 2. Regex match — solo si hay prefijo
        if (hasPrefix && command) {
            for (const [re, plugin] of this.regex) {
                if (re.test(command)) return plugin;
            }
        }

        // 3. CustomPrefix match (funciona con o sin prefijo del bot)
        for (const [matcher, plugin] of this.customPrefixPlugins) {
            if (typeof matcher === 'function') {
                if (matcher(rawText)) return plugin;
            } else if (matcher instanceof RegExp) {
                if (matcher.test(rawText)) return plugin;
            }
        }

        return null;
    }

    /** Retorna los plugins que tienen hooks `before`. */
    getBeforePlugins(): Plugin[] {
        return this.beforePlugins;
    }
}

/** Instancia singleton del router. */
export const router = new CommandRouter();
