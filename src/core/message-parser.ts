/**
 * Parser de mensajes de WhatsApp.
 * Extrae texto, prefijo, comando y argumentos de un mensaje entrante.
 * Lógica pura sin side-effects.
 */

export interface ParsedMessage {
    /** Texto original completo del mensaje. */
    originalText: string;
    /** Texto restante después de quitar prefijo y comando (args como string). */
    text: string;
    /** Prefijo usado ("#", "/", ".", etc.) o "" si no hubo prefijo. */
    usedPrefix: string;
    /** Nombre del comando en lowercase. */
    command: string;
    /** Argumentos del comando (split por espacios/newlines). */
    args: string[];
}

/**
 * Extrae el texto crudo del contenido de un mensaje de WhatsApp.
 * Maneja mensajes efímeros, viewOnce, texto extendido, imágenes con caption, etc.
 */
type MessageContainer = Pick<proto.IWebMessageInfo, 'message'> | Pick<BotMessage, 'message'>;

export function extractRawText(m: MessageContainer): string {
    const messageContent =
        m.message?.ephemeralMessage?.message ||
        m.message?.viewOnceMessage?.message ||
        m.message;

    if (!messageContent) return "";

    if (messageContent.conversation) return messageContent.conversation;
    if (messageContent.extendedTextMessage?.text) return messageContent.extendedTextMessage.text;
    if (messageContent.imageMessage?.caption) return messageContent.imageMessage.caption;
    if (messageContent.videoMessage?.caption) return messageContent.videoMessage.caption;
    if (messageContent.buttonsResponseMessage?.selectedButtonId) return messageContent.buttonsResponseMessage.selectedButtonId;
    if (messageContent.listResponseMessage?.singleSelectReply?.selectedRowId) return messageContent.listResponseMessage.singleSelectReply.selectedRowId;

    const contextInfo = messageContent.messageContextInfo as {quotedMessage?: proto.IMessage} | undefined;
    if (contextInfo?.quotedMessage) {
        const quoted = contextInfo.quotedMessage;
        return quoted?.conversation || quoted?.extendedTextMessage?.text || "";
    }

    if (m.message?.conversation) return m.message.conversation;

    return "";
}

/**
 * Parsea un mensaje: extrae texto, identifica prefijo, separa comando y argumentos.
 */
export function parseMessage(m: MessageContainer, prefixes: string[]): ParsedMessage {
    const originalText = extractRawText(m).trim();

    const usedPrefix = prefixes.find(p => originalText.startsWith(p)) || "";
    const withoutPrefix = originalText.slice(usedPrefix.length).trim();
    const [commandName = "", ...argsArr] = withoutPrefix.split(/[\n\s]+/);
    const command = commandName.toLowerCase();
    const args = argsArr;

    // Texto sin prefijo ni comando (lo que los plugins reciben como `text`)
    const text = withoutPrefix.slice(commandName.length).trimStart();

    return {originalText, text, usedPrefix, command, args};
}
import type {proto} from '@whiskeysockets/baileys';
import type {BotMessage} from '../types/message.js';
