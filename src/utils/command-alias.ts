export type AliasableCommand = {
    aliases?: readonly string[];
};

export function buildAliasMap<T extends AliasableCommand>(commands: Record<string, T>): Record<string, T> {
    const aliasMap: Record<string, T> = {};

    for (const [key, item] of Object.entries(commands)) {
        aliasMap[key.toLowerCase()] = item;
        for (const alias of item.aliases || []) {
            aliasMap[alias.toLowerCase()] = item;
        }
    }

    return aliasMap;
}

export function buildAliasRegex(aliasMap: Record<string, unknown>): RegExp {
    const aliases = Object.keys(aliasMap).map(escapeRegExp);
    return new RegExp(`^(${aliases.join('|')})$`, 'i');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
