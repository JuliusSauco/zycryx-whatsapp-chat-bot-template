import {
    getRequiredContentObjectList,
    getRequiredContentString,
    getRequiredContentStringList,
    renderContentTemplate,
    type ContentTemplateValue,
} from './content.js';

export function getRequiredPluginMessage(path: string): string {
    return getRequiredContentString(path);
}

export function getRequiredPluginMessageList(path: string): string[] {
    return getRequiredContentStringList(path);
}

export function getRequiredPluginMessageObjectList<T extends object>(path: string): T[] {
    return getRequiredContentObjectList<T>(path);
}

export function renderTemplate(template: string, values: Record<string, ContentTemplateValue>): string {
    return renderContentTemplate(template, values);
}
