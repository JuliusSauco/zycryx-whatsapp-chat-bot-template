import {
    getCommandCatalog,
    getCommandCatalogEntry,
    getCommandCatalogMatch,
    getFallbackCommandEmoji,
    normalizeCommandCatalogKey,
    type CommandCatalogEntry,
} from '../../services/command-catalog.service.js';

export interface MenuCommandMetadata {
    emoji: string;
    usage: string;
    description: string;
}

export const fallbackEmojiByTag: Record<string, string> = getCommandCatalog().fallbackEmojiByTag;
export const commandMetadata: Record<string, MenuCommandMetadata> = getCommandCatalog().commands;

export function getCommandMetadata(command: string, tags: string[]): MenuCommandMetadata {
    const match = getCommandCatalogMatch(command);
    if (match) {
        const metadata = toMenuMetadata(match.entry);
        if (match.source === 'base' && hasSpecificArguments(command)) {
            return {...metadata, usage: stripPrefix(command)};
        }
        return metadata;
    }

    const entry = getCommandCatalogEntry(command);
    if (entry) return toMenuMetadata(entry);
    return {
        emoji: getFallbackCommandEmoji(tags),
        usage: command,
        description: 'Comando disponible en esta categoria.',
    };
}

export function normalizeCommandKey(command: string): string {
    return normalizeCommandCatalogKey(command);
}

export function getMenuCommandDedupeKey(command: string): string {
    const match = getCommandCatalogMatch(command);
    if (!match) return `raw:${stripPrefix(command).toLowerCase()}`;
    if (match.source === 'base' && hasSpecificArguments(command)) {
        return `raw:${stripPrefix(command).toLowerCase()}`;
    }
    return `catalog:${match.key}`;
}

function toMenuMetadata(entry: CommandCatalogEntry): MenuCommandMetadata {
    return {
        emoji: entry.emoji,
        usage: entry.usage,
        description: entry.description,
    };
}

function hasSpecificArguments(command: string): boolean {
    return stripPrefix(command).split(/\s+/).filter(Boolean).length > 1;
}

function stripPrefix(command: string): string {
    return command.trim().replace(/^[#./!]/, '');
}
