import {
    getRequiredContentObjectList,
    getRequiredContentString,
    getRequiredContentStringList,
    renderContentTemplate,
    renderRequiredContentString,
    type ContentTemplateValue,
} from '../lib/content.js';

export type MessageTemplateValue = ContentTemplateValue;

export function getMessage(path: string): string {
    return getRequiredContentString(path);
}

export function getMessageList(path: string): string[] {
    return getRequiredContentStringList(path);
}

export function getMessageObjectList<T extends object>(path: string): T[] {
    return getRequiredContentObjectList<T>(path);
}

export function renderMessage(path: string, values: Record<string, MessageTemplateValue>): string {
    return renderRequiredContentString(path, values);
}

export function renderTemplate(template: string, values: Record<string, MessageTemplateValue>): string {
    return renderContentTemplate(template, values);
}

export const content = {
    message: getMessage,
    messageList: getMessageList,
    messageObjectList: getMessageObjectList,
    renderMessage,
    renderTemplate,
};
