import type {proto} from '@whiskeysockets/baileys';
import type {BotMessage} from '../types/message.js';
import type {SendMessageOptions} from '../types/context.js';

type ReplyOptions = string | null | SendMessageOptions;

export function userError(message: string): string {
    return `⚠️ ${message}`;
}

export function success(message: string): string {
    return `✅ ${message}`;
}

export function failure(message: string): string {
    return `❌ ${message}`;
}

export function usage(commandExample: string, details?: string): string {
    return details ? `⚠️ Uso:\n${commandExample}\n\n${details}` : `⚠️ Uso:\n${commandExample}`;
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function reportableError(error: unknown): string {
    return `\`\`\`⚠️ OCURRIO UN ERROR ⚠️\`\`\`\n\n> *Reporta el siguiente error a mi creador con el comando:* #report\n\n>>> ${errorMessage(error)} <<<<`;
}

export function replyUserError(m: BotMessage, message: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo> {
    return m.reply(userError(message), options, sendOptions);
}

export function replySuccess(m: BotMessage, message: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo> {
    return m.reply(success(message), options, sendOptions);
}

export function replyFailure(m: BotMessage, message: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo> {
    return m.reply(failure(message), options, sendOptions);
}

export function replyUsage(m: BotMessage, commandExample: string, details?: string, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo> {
    return m.reply(usage(commandExample, details), options, sendOptions);
}

export function replyReportableError(m: BotMessage, error: unknown, options?: ReplyOptions, sendOptions?: SendMessageOptions): Promise<proto.WebMessageInfo> {
    return m.reply(reportableError(error), options, sendOptions);
}
