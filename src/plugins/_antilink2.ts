import {getGroupSettings} from '../services/group-settings.service.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';
import type {ExtendedConn} from '../types/context.js';
import type {BotMessage} from '../types/message.js';

const linkRegex = /https?:\/\/\S+/i;
type MessageKeyWithAlt = BotMessage['key'] & {participantAlt?: string};

export async function before(m: BotMessage, {conn}: {conn: ExtendedConn}) {
    if (!m.isGroup || !m.originalText) return;
    const userTag = `@${m.sender.split('@')[0]}`;
    const bang = m.key.id;
    let delet = (m.key as MessageKeyWithAlt).participantAlt || m.key.participant || m.sender;

    try {
        const config = await getGroupSettings(m.chat);
        if (!config?.antilink2) return;
    } catch (e: unknown) {
        console.error(e);
        return;
    }

    const isGroupLink = linkRegex.test(m.originalText);
    if (!isGroupLink) return;
    const metadata = await conn.groupMetadata(m.chat);
    const botId = conn.user?.id?.replace(/:\d+@/, "@");
    const isBotAdmin = metadata.participants.some((p: GroupParticipant) => {
        const pid = p.id?.replace(/:\d+/, "");
        return (pid === botId || pid === (conn.user?.lid || "").replace(/:\d+/, "")) && p.admin;
    });

    const senderVariants = [m.sender, m.lid].filter(Boolean).map(j => j.replace(/:\d+/, ""));
    const isSenderAdmin = metadata.participants.some((p: GroupParticipant) => {
        const pid = p.id?.replace(/:\d+/, "");
        return senderVariants.includes(pid) && p.admin;
    });

    if (isSenderAdmin || m.fromMe) return;
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
        console.error(err);
    }
}
