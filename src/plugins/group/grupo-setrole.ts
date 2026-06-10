import type {GroupParticipant} from '@whiskeysockets/baileys';
import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {setGroupUserRole} from '../../services/group-role.service.js';
import {isGroupCreator, getParticipantIdentityJids} from '../../utils/group-creator.js';
import {cleanJid} from '../../utils/jid.js';

type ParticipantWithAliases = GroupParticipant & {
    phoneNumber?: string | number | null;
    participantAlt?: string | null;
};

function getTargetJid(m: {mentionedJid?: string[]; quoted?: {sender?: string | null} | null}): string | null {
    return cleanJid(m.mentionedJid?.[0] || m.quoted?.sender || '');
}

function findParticipantByJid(participants: GroupParticipant[], jid: string): ParticipantWithAliases | null {
    const cleanTarget = cleanJid(jid);
    return (participants as ParticipantWithAliases[]).find(participant =>
        getParticipantIdentityJids(participant).some(candidate => cleanJid(candidate) === cleanTarget)
    ) || null;
}

export default definePlugin({
    help: ['setrole @usuario Rol|Descripcion'],
    tags: ['group'],
    command: /^setrole$/i,
    group: true,
    register: true,
    async execute(m, {conn, text, isOwner, metadata, participants, chatId}) {
    if (!isOwner && !isGroupCreator({chatId: chatId || m.chat, sender: m.sender, senderLid: m.lid, metadata})) {
        throw getRequiredPluginMessage('group.setRole.ownerOrFounderOnly');
    }

    const targetJid = getTargetJid(m);
    if (!targetJid) return m.reply(getRequiredPluginMessage('group.setRole.missingUser'));

    const target = findParticipantByJid(participants, targetJid);
    if (!target?.admin) {
        return m.reply(getRequiredPluginMessage('group.setRole.targetNotAdmin'));
    }
    const roleUserId = getParticipantIdentityJids(target).find(jid => jid.endsWith('@s.whatsapp.net')) || targetJid;

    const cleanText = text
        .replace(/@\d+/g, '')
        .trim();
    if (!cleanText) return m.reply(getRequiredPluginMessage('group.setRole.missingRole'));

    const [rawRole, rawDescription] = cleanText.split('|');
    const role = rawRole?.trim();
    const roleDescription = rawDescription?.trim() || null;
    if (!role) return m.reply(getRequiredPluginMessage('group.setRole.missingRole'));

    await setGroupUserRole({
        groupId: chatId || m.chat,
        userId: roleUserId,
        role,
        roleDescription,
        updatedBy: m.sender,
    });

    return conn.sendMessage(m.chat, {text: renderTemplate(getRequiredPluginMessage(roleDescription ? 'group.setRole.saved' : 'group.setRole.savedWithoutDescription'), {
        user: roleUserId.split('@')[0],
        role,
    }), mentions: [roleUserId]}, {quoted: m});
    }
});
