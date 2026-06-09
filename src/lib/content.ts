import {loadCachedJsonResource} from './local-json-resource.js';

export type ContentTemplateValue = string | number | boolean | null | undefined;

interface ContentManifest {
    pluginMessages?: Record<string, unknown>;
}

const CONTENT_MANIFEST_PATH = 'resources/data/messages.json';

export function getRequiredContentString(path: string): string {
    const value = getContentValue(path);
    if (typeof value !== 'string') throw new Error(`Missing content string: ${path}`);
    return value;
}

export function getRequiredContentStringList(path: string): string[] {
    const value = getContentValue(path);
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value;
    throw new Error(`Missing content string list: ${path}`);
}

export function getRequiredContentObjectList<T extends object>(path: string): T[] {
    const value = getContentValue(path);
    if (Array.isArray(value) && value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
        return value as T[];
    }
    throw new Error(`Missing content object list: ${path}`);
}

export function renderContentTemplate(template: string, values: Record<string, ContentTemplateValue>): string {
    return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (match, key: string) => {
        const value = values[key];
        return value === null || value === undefined ? match : String(value);
    });
}

export function renderRequiredContentString(path: string, values: Record<string, ContentTemplateValue>): string {
    return renderContentTemplate(getRequiredContentString(path), values);
}

function getContentValue(path: string): unknown {
    const manifest = loadCachedJsonResource<ContentManifest>(CONTENT_MANIFEST_PATH);
    let current: unknown = manifest?.pluginMessages;

    for (const part of path.split('.')) {
        if (!current || typeof current !== 'object' || !(part in current)) return undefined;
        current = (current as Record<string, unknown>)[part];
    }

    return current;
}
