import type {GroupParticipant} from '@whiskeysockets/baileys';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
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

export default defineSdkPlugin({
    help: ['setrole @usuario Rol|Descripcion'],
    tags: ['group'],
    command: /^setrole$/i,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    if (!sdk.isOwner && !isGroupCreator({chatId: sdk.chatId, sender: sdk.sender, senderLid: m.lid, metadata: sdk.metadata})) {
        throw sdk.content.message('group.setRole.ownerOrFounderOnly');
    }

    const targetJid = getTargetJid(m);
    if (!targetJid) return sdk.reply.message('group.setRole.missingUser');

    const target = findParticipantByJid(sdk.participants, targetJid);
    if (!target?.admin) {
        return sdk.reply.message('group.setRole.targetNotAdmin');
    }
    const roleUserId = getParticipantIdentityJids(target).find(jid => jid.endsWith('@s.whatsapp.net')) || targetJid;

    const cleanText = sdk.text
        .replace(/@\d+/g, '')
        .trim();
    if (!cleanText) return sdk.reply.message('group.setRole.missingRole');

    const [rawRole, rawDescription] = cleanText.split('|');
    const role = rawRole?.trim();
    const roleDescription = rawDescription?.trim() || null;
    if (!role) return sdk.reply.message('group.setRole.missingRole');

    await setGroupUserRole({
        groupId: sdk.chatId,
        userId: roleUserId,
        role,
        roleDescription,
        updatedBy: sdk.sender,
    });

    return sdk.sendMessage({text: sdk.content.renderMessage(roleDescription ? 'group.setRole.saved' : 'group.setRole.savedWithoutDescription', {
        user: roleUserId.split('@')[0],
        role,
    }), mentions: [roleUserId]});
    }
});
