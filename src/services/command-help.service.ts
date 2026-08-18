import {getLoadedPlugins} from '../core/runtime-state.js';
import type {Plugin} from '../types/plugin.js';
import {
    getCommandCatalogEntry,
    getFallbackCommandEmoji,
    type CommandCatalogEntry,
} from './command-catalog.service.js';

const HELP_FLAGS = new Set(['--help', '-h', 'help', 'ayuda']);

export interface CommandHelpOptions {
    query: string;
    usedPrefix: string;
    plugin?: Plugin;
}

export function isInlineHelpRequest(args: string[]): boolean {
    return args.some(arg => arg.toLowerCase() === '--help' || arg.toLowerCase() === '-h');
}

export function buildInlineHelpQuery(command: string, text: string): string {
    return cleanHelpQuery(`${command} ${text}`);
}

export function renderCommandHelp(options: CommandHelpOptions): string {
    const prefix = options.usedPrefix || '#';
    const query = cleanHelpQuery(options.query);

    if (!query) {
        return [
            '📚 *Ayuda*',
            `Usa: ${prefix}help play`,
            `Menu: ${prefix}menu`,
        ].join('\n');
    }

    const plugin = options.plugin || findPluginForHelpQuery(query);
    const entry = getCommandCatalogEntry(query);
    if (!entry && !plugin) {
        return [
            '🔎 *No encontre ese comando*',
            `Usa ${prefix}menu para explorar categorias.`,
        ].join('\n');
    }

    const target = buildHelpTarget(query, entry, plugin);
    return renderHelpTarget(target, prefix);
}

function buildHelpTarget(query: string, entry?: CommandCatalogEntry, plugin?: Plugin): Required<CommandCatalogEntry> {
    const tags = Array.isArray(plugin?.tags) ? plugin.tags.filter(isNonEmptyString) : [];
    const help = Array.isArray(plugin?.help) ? plugin.help.filter(isNonEmptyString) : [];
    const firstHelp = help[0] || query;
    const role = entry?.requiredRole || inferRequiredRole(plugin);
    const scope = entry?.scope || inferScope(plugin);

    return {
        emoji: entry?.emoji || getFallbackCommandEmoji(tags),
        usage: entry?.usage || firstHelp,
        description: entry?.description || 'Comando disponible en esta categoria.',
        aliases: uniqueTextValues(entry?.aliases || []),
        examples: uniqueTextValues(entry?.examples || help.slice(0, 2)),
        requiredRole: role,
        scope,
    };
}

function renderHelpTarget(entry: Required<CommandCatalogEntry>, prefix: string): string {
    const usage = withPrefix(entry.usage, prefix);
    const aliases = uniqueTextValues(entry.aliases)
        .filter(alias => firstCommand(alias).toLowerCase() !== firstCommand(entry.usage).toLowerCase())
        .slice(0, 6);
    const examples = uniqueTextValues(entry.examples)
        .map(example => withPrefix(example, prefix))
        .filter(example => normalizeText(example) !== normalizeText(usage))
        .slice(0, 2);
    const requirements = renderRequirements(entry.requiredRole, entry.scope);
    const lines = [
        `${entry.emoji} *${commandTitle(entry.usage)}*`,
        entry.description,
        `*Uso:* ${usage}`,
    ];

    if (examples.length) lines.push(`*Ejemplo:* ${examples.join(' | ')}`);
    if (aliases.length) lines.push(`*Alias:* ${aliases.join(', ')}`);
    if (requirements) lines.push(`*Requiere:* ${requirements}`);

    return lines.join('\n');
}

function findPluginForHelpQuery(query: string): Plugin | undefined {
    const normalized = firstCommand(query).toLowerCase();
    const plugins = Object.values(getLoadedPlugins());
    return plugins.find(plugin => pluginMatchesCommand(plugin, normalized) || pluginHelpMatches(plugin, normalized));
}

function pluginMatchesCommand(plugin: Plugin, command: string): boolean {
    const pluginCommand = plugin.command;
    if (typeof pluginCommand === 'string') return pluginCommand.toLowerCase() === command;
    if (Array.isArray(pluginCommand)) return pluginCommand.some(item => item.toLowerCase() === command);
    if (pluginCommand instanceof RegExp) {
        pluginCommand.lastIndex = 0;
        return pluginCommand.test(command);
    }
    return false;
}

function pluginHelpMatches(plugin: Plugin, command: string): boolean {
    if (!Array.isArray(plugin.help)) return false;
    return plugin.help.some(item => firstCommand(item).toLowerCase() === command);
}

function cleanHelpQuery(query: string): string {
    return query
        .split(/\s+/)
        .filter(part => part && !HELP_FLAGS.has(part.toLowerCase()))
        .join(' ')
        .trim();
}

function inferRequiredRole(plugin?: Plugin): 'member' | 'admin' | 'superadmin' | 'owner' {
    if (plugin?.owner) return 'owner';
    if (plugin?.admin || plugin?.botAdmin) return 'admin';
    return 'member';
}

function inferScope(plugin?: Plugin): 'group' | 'private' | 'both' {
    if (plugin?.group) return 'group';
    if (plugin?.private) return 'private';
    return 'both';
}

function renderRequirements(role: CommandCatalogEntry['requiredRole'], scope: CommandCatalogEntry['scope']): string {
    const parts = [
        role && role !== 'member' ? roleLabel(role) : '',
        scope && scope !== 'both' ? scopeLabel(scope) : '',
    ].filter(Boolean);
    return parts.join(', ');
}

function roleLabel(role: Exclude<CommandCatalogEntry['requiredRole'], undefined>): string {
    switch (role) {
        case 'owner':
            return 'owner';
        case 'superadmin':
            return 'creador del grupo';
        case 'admin':
            return 'admin';
        default:
            return '';
    }
}

function scopeLabel(scope: Exclude<CommandCatalogEntry['scope'], undefined>): string {
    return scope === 'group' ? 'grupo' : 'privado';
}

function withPrefix(command: string, prefix: string): string {
    const clean = command.trim();
    if (!clean) return clean;
    if (/^[#./!]/.test(clean)) return clean;
    if (/^[>$=]/.test(clean)) return clean;
    return `${prefix}${clean}`;
}

function firstCommand(command: string): string {
    return command
        .trim()
        .replace(/^[#./!]/, '')
        .split(/\s+/)[0] || command.trim();
}

function commandTitle(command: string): string {
    const tokens = command
        .trim()
        .replace(/^[#./!]/, '')
        .split(/\s+/)
        .filter(Boolean);
    const titleTokens: string[] = [];
    for (const token of tokens) {
        if (token.startsWith('<') || token.startsWith('@')) break;
        if (token.startsWith('[') && titleTokens.length > 0) break;
        titleTokens.push(token);
    }
    return titleTokens.join(' ') || firstCommand(command);
}

function uniqueTextValues(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const clean = value.trim();
        if (!clean) continue;
        const key = normalizeText(clean);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(clean);
    }
    return result;
}

function normalizeText(value: string): string {
    return value.trim().replace(/^[#./!]/, '').replace(/\s+/g, ' ').toLowerCase();
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}
