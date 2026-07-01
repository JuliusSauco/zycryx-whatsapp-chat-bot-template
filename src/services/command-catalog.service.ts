import {loadCachedJsonResource} from '../lib/local-json-resource.js';

const COMMAND_CATALOG_PATH = 'resources/data/commands.json';

export interface CommandCatalogGuidelines {
    descriptionStyle?: string;
    usageStyle?: string;
    aliasStyle?: string;
}

export interface CommandCatalogEntry {
    emoji: string;
    usage: string;
    description: string;
    aliases?: string[];
    examples?: string[];
    requiredRole?: 'member' | 'admin' | 'superadmin' | 'owner';
    scope?: 'group' | 'private' | 'both';
}

export interface CommandCatalog {
    version: number;
    guidelines: CommandCatalogGuidelines;
    fallbackEmojiByTag: Record<string, string>;
    commands: Record<string, CommandCatalogEntry>;
}

export type CommandCatalogMatchSource = 'exact' | 'two_part' | 'paginated' | 'alias' | 'base';

export interface CommandCatalogMatch {
    key: string;
    entry: CommandCatalogEntry;
    source: CommandCatalogMatchSource;
}

let cachedManifest: unknown;
let cachedCatalog: CommandCatalog | null = null;

export function getCommandCatalog(): CommandCatalog {
    const manifest = loadCachedJsonResource<unknown>(COMMAND_CATALOG_PATH);
    if (!manifest) throw new Error(`Missing command catalog resource: ${COMMAND_CATALOG_PATH}`);
    if (manifest === cachedManifest && cachedCatalog) return cachedCatalog;

    cachedManifest = manifest;
    cachedCatalog = parseCommandCatalog(manifest);
    return cachedCatalog;
}

export function getCommandCatalogEntry(command: string): CommandCatalogEntry | undefined {
    const catalog = getCommandCatalog();
    return getCommandCatalogMatch(command, catalog.commands)?.entry;
}

export function getFallbackCommandEmoji(tags: string[]): string {
    const fallbackEmojiByTag = getCommandCatalog().fallbackEmojiByTag;
    const tag = tags.find(value => fallbackEmojiByTag[value]);
    return tag ? fallbackEmojiByTag[tag] : '🔹';
}

export function normalizeCommandCatalogKey(
    command: string,
    commands: Record<string, CommandCatalogEntry> = getCommandCatalog().commands,
): string {
    const match = getCommandCatalogMatch(command, commands);
    if (match) return match.key;
    return normalizeCommandInput(command).first;
}

export function getCommandCatalogMatch(
    command: string,
    commands: Record<string, CommandCatalogEntry> = getCommandCatalog().commands,
): CommandCatalogMatch | undefined {
    const normalized = normalizeCommandInput(command);
    const exact = commands[normalized.exact];
    if (exact) return {key: normalized.exact, entry: exact, source: 'exact'};

    const twoPart = [normalized.first, normalized.second].filter(Boolean).join(' ');
    const twoPartEntry = twoPart ? commands[twoPart] : undefined;
    if (twoPartEntry) return {key: twoPart, entry: twoPartEntry, source: 'two_part'};

    const paginatedFirst = normalized.first.replace(/\d+$/, '');
    const paginatedEntry = paginatedFirst !== normalized.first ? commands[paginatedFirst] : undefined;
    if (paginatedEntry) return {key: paginatedFirst, entry: paginatedEntry, source: 'paginated'};

    const aliasMatch = findAliasMatch(command, commands);
    if (aliasMatch) return aliasMatch;

    const base = commands[normalized.first];
    if (base) return {key: normalized.first, entry: base, source: 'base'};
    return undefined;
}

function parseCommandCatalog(manifest: unknown): CommandCatalog {
    if (!isRecord(manifest)) throw new Error('Command catalog must be an object');
    const version = readNumber(manifest.version, 'version');
    const guidelines = parseGuidelines(manifest.guidelines);
    const fallbackEmojiByTag = readStringRecord(manifest.fallbackEmojiByTag, 'fallbackEmojiByTag');
    const rawCommands = readRecord(manifest.commands, 'commands');
    const commands = Object.fromEntries(
        Object.entries(rawCommands).map(([key, value]) => [normalizeCatalogKey(key), parseEntry(key, value)]),
    );

    return {version, guidelines, fallbackEmojiByTag, commands};
}

function parseGuidelines(value: unknown): CommandCatalogGuidelines {
    if (value === undefined) return {};
    if (!isRecord(value)) throw new Error('Command catalog guidelines must be an object');
    return {
        descriptionStyle: readOptionalString(value.descriptionStyle, 'guidelines.descriptionStyle'),
        usageStyle: readOptionalString(value.usageStyle, 'guidelines.usageStyle'),
        aliasStyle: readOptionalString(value.aliasStyle, 'guidelines.aliasStyle'),
    };
}

function parseEntry(key: string, value: unknown): CommandCatalogEntry {
    if (!isRecord(value)) throw new Error(`Command catalog entry must be an object: ${key}`);
    return {
        emoji: readString(value.emoji, `${key}.emoji`),
        usage: readString(value.usage, `${key}.usage`),
        description: readString(value.description, `${key}.description`),
        aliases: readOptionalStringArray(value.aliases, `${key}.aliases`),
        examples: readOptionalStringArray(value.examples, `${key}.examples`),
        requiredRole: readOptionalEnum(value.requiredRole, `${key}.requiredRole`, ['member', 'admin', 'superadmin', 'owner']),
        scope: readOptionalEnum(value.scope, `${key}.scope`, ['group', 'private', 'both']),
    };
}

function findAliasMatch(command: string, commands: Record<string, CommandCatalogEntry>): CommandCatalogMatch | undefined {
    const normalized = normalizeCommandInput(command);
    const match = Object.entries(commands).find(([, entry]) => {
        const aliases = entry.aliases || [];
        return aliases.some(alias => {
            const normalizedAlias = normalizeCommandInput(alias);
            return normalizedAlias.exact === normalized.exact || normalizedAlias.first === normalized.first;
        });
    });
    return match ? {key: match[0], entry: match[1], source: 'alias'} : undefined;
}

function normalizeCommandInput(command: string): {exact: string; first: string; second: string} {
    const parts = command
        .trim()
        .replace(/^[#./!]/, '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part.replace(/[<[].*$/, ''));
    const first = normalizeCatalogKey(parts[0] || '');
    const second = normalizeCatalogKey(parts[1] || '');
    const exact = [first, second, ...parts.slice(2).map(normalizeCatalogKey)]
        .filter(Boolean)
        .join(' ');
    return {exact, first, second};
}

function normalizeCatalogKey(value: string): string {
    return value.trim().toLowerCase();
}

function readRecord(value: unknown, field: string): Record<string, unknown> {
    if (!isRecord(value)) throw new Error(`Command catalog field must be an object: ${field}`);
    return value;
}

function readStringRecord(value: unknown, field: string): Record<string, string> {
    const record = readRecord(value, field);
    for (const [key, item] of Object.entries(record)) {
        if (typeof item !== 'string' || item.trim().length === 0) {
            throw new Error(`Command catalog field must be a string map: ${field}.${key}`);
        }
    }
    return record as Record<string, string>;
}

function readNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Command catalog field must be a number: ${field}`);
    }
    return value;
}

function readString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Command catalog field must be a non-empty string: ${field}`);
    }
    return value;
}

function readOptionalString(value: unknown, field: string): string | undefined {
    if (value === undefined) return undefined;
    return readString(value, field);
}

function readOptionalStringArray(value: unknown, field: string): string[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string' && item.trim().length > 0)) {
        throw new Error(`Command catalog field must be a string array: ${field}`);
    }
    return value;
}

function readOptionalEnum<T extends string>(value: unknown, field: string, values: readonly T[]): T | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'string' && (values as readonly string[]).includes(value)) return value as T;
    throw new Error(`Command catalog field has an invalid value: ${field}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
