import {logError} from '../../lib/logger.js';
import type {BeforePluginContext} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';

const linkRegex = /https?:\/\/\S+/i;
type MessageKeyWithAlt = BotMessage['key'] & {participantAlt?: string};

export async function before(m: BotMessage, {conn, groupSettings, isAdmin, isBotAdmin}: BeforePluginContext) {
    if (!m.isGroup || !m.originalText) return;
    const userTag = `@${m.sender.split('@')[0]}`;
    const bang = m.key.id;
    let delet = (m.key as MessageKeyWithAlt).participantAlt || m.key.participant || m.sender;

    if (!groupSettings?.antilink2) return;

    const isGroupLink = linkRegex.test(m.originalText);
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
        text: `*「 ANTILINK DETECTADO 」*\n\n${userTag}, enviaste un link pero no puedo eliminarte porque no soy admin.`,
        mentions: [m.sender]
    }, {quoted: m});
    await conn.sendMessage(m.chat, {
        text: `*「 ANTILINK DETECTADO 」*\n\n${userTag}, rompiste las reglas del grupo y serás eliminado.`,
        mentions: [m.sender]
    }, {quoted: m});
    try {
        await conn.sendMessage(m.chat, {delete: {remoteJid: m.chat, fromMe: false, id: bang, participant: delet}});
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
    } catch (err: unknown) {
        logError(err);
    }
}
