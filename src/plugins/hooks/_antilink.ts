import {logError} from '../../lib/logger.js';
import {content} from '../../services/content.service.js';
import type {BeforePluginContext} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';

export const beforePolicy = {phase: 'security', priority: 100, failurePolicy: 'fail-closed'} as const;

let linkRegex1 = /chat\.whatsapp\.com\/[0-9A-Za-z]{20,24}|5chat-whatzapp\.vercel\.app/i;
let linkRegex2 = /whatsapp\.com\/channel\/[0-9A-Za-z]{20,24}/i;
type MessageKeyWithAlt = BotMessage['key'] & {participantAlt?: string};

export async function before(m: BotMessage, {conn, groupSettings, isAdmin, isBotAdmin}: BeforePluginContext) {
    if (!m.isGroup || !m.originalText) return;
    const userTag = `@${m.sender.split('@')[0]}`;
    const bang = m.key.id;
    let delet = (m.key as MessageKeyWithAlt).participantAlt || m.key.participant || m.sender;

    if (!groupSettings?.antilink) return;

    const isGroupLink = linkRegex1.test(m.originalText) || linkRegex2.test(m.originalText);
    if (!isGroupLink) return;

    if (isAdmin || m.fromMe) return;
    if (conn.groupInviteCode) {
        try {
            const code = await conn.groupInviteCode(m.chat);
            if (m.originalText.includes(`https://chat.whatsapp.com/${code}`)) return;
        } catch (e: unknown) {
        }
    }

    if (!isBotAdmin) return await conn.sendMessage(m.chat, {
        text: content.renderMessage('hooks.antiLink.botNotAdmin', {user: userTag}),
        mentions: [m.sender]
    }, {quoted: m});
    await conn.sendMessage(m.chat, {
        text: content.renderMessage('hooks.antiLink.removed', {user: userTag}),
        mentions: [m.sender]
    }, {quoted: m});
    try {
        await conn.sendMessage(m.chat, {delete: {remoteJid: m.chat, fromMe: false, id: bang, participant: delet}});
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
    } catch (err: unknown) {
        logError(err);
    }
}
