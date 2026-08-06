import type {Plugin, PluginManifest} from '../types/plugin.js';

export class PluginRegistryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PluginRegistryError';
    }
}

export interface PluginRegistrySnapshot {
    plugins: Readonly<Record<string, Plugin>>;
    manifests: ReadonlyMap<string, Readonly<PluginManifest>>;
    warnings: readonly string[];
}

export function buildPluginRegistry(plugins: Record<string, Plugin>): PluginRegistrySnapshot {
    const exact = new Map<string, string>();
    const regex = new Map<string, string>();
    const custom = new Map<string, {id: string; priority: number}>();
    const manifests = new Map<string, Readonly<PluginManifest>>();
    const warnings: string[] = [];
    const regexAliases = new Map<string, string>();

    for (const [path, plugin] of Object.entries(plugins)) {
        const id = plugin.__name || path;
        if (!id.trim()) throw new PluginRegistryError(`Plugin sin ID estable: ${path}`);
        const commands = typeof plugin.command === 'string' ? [plugin.command] : Array.isArray(plugin.command) ? plugin.command : [];
        for (const command of commands) {
            const alias = command.trim().toLowerCase();
            if (!alias) throw new PluginRegistryError(`Comando vacío en ${id}`);
            const owner = exact.get(alias);
            if (owner && owner !== id) throw new PluginRegistryError(`Alias duplicado "${alias}": ${owner} y ${id}`);
            exact.set(alias, id);
        }
        if (plugin.command instanceof RegExp) {
            const signature = `${plugin.command.source}/${plugin.command.flags}`;
            const owner = regex.get(signature);
            if (owner && owner !== id) throw new PluginRegistryError(`Regex duplicada ${signature}: ${owner} y ${id}`);
            regex.set(signature, id);
            for (const alias of extractSimpleRegexAliases(plugin.command)) {
                const exactOwner = exact.get(alias);
                const regexOwner = regexAliases.get(alias);
                if (exactOwner && exactOwner !== id) warnings.push(`Posible solapamiento "${alias}": ${exactOwner} y ${id}`);
                if (regexOwner && regexOwner !== id) warnings.push(`Posible solapamiento regex "${alias}": ${regexOwner} y ${id}`);
                regexAliases.set(alias, id);
            }
        }
        if (plugin.customPrefix && plugin.customPrefixPriority === undefined) {
            throw new PluginRegistryError(`customPrefix sin prioridad explicita: ${id}`);
        }
        if (plugin.customPrefix instanceof RegExp) {
            const signature = `${plugin.customPrefix.source}/${plugin.customPrefix.flags}`;
            const priority = plugin.customPrefixPriority ?? 0;
            const owner = custom.get(signature);
            if (owner && owner.priority === priority) throw new PluginRegistryError(`customPrefix duplicado con igual prioridad: ${owner.id} y ${id}`);
            custom.set(signature, {id, priority});
        }
        const manifest = Object.freeze({
            id,
            commands: Array.isArray(plugin.command) ? Object.freeze([...plugin.command]) : plugin.command,
            customPrefix: plugin.customPrefix,
            customPrefixPriority: plugin.customPrefixPriority ?? 0,
            permissions: Object.freeze({
                owner: !!plugin.owner,
                admin: !!plugin.admin,
                botAdmin: !!plugin.botAdmin,
                register: !!plugin.register,
            }),
            scope: plugin.group ? 'group' : plugin.private ? 'private' : 'both',
            resources: Object.freeze({
                limit: plugin.limit ?? 0,
                coins: plugin.coins ?? 0,
                alternativeCoins: plugin.alternativeCoins ?? 0,
                level: plugin.level ?? 0,
            }),
            feature: plugin.feature,
            commandAccess: plugin.commandAccess ? Object.freeze({
                ...plugin.commandAccess,
                defaultRule: Object.freeze({...plugin.commandAccess.defaultRule}),
            }) : undefined,
            executionPolicy: Object.freeze({...plugin.executionPolicy}),
            interceptors: Object.freeze([...(plugin.interceptors ?? [])]),
        }) as Readonly<PluginManifest>;
        plugin.manifest = manifest;
        manifests.set(id, manifest);
    }
    return {plugins: Object.freeze({...plugins}), manifests, warnings: Object.freeze(warnings)};
}

function extractSimpleRegexAliases(regex: RegExp): string[] {
    const match = /^\^\(([^()[\]{}+*?\\]+)\)\$$/.exec(regex.source);
    if (!match?.[1]) return [];
    return match[1].split('|').map(value => value.toLowerCase()).filter(value => /^[a-z0-9_-]+$/.test(value));
}
