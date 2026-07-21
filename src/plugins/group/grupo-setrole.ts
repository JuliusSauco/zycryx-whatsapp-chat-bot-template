import type {GroupParticipant} from '@whiskeysockets/baileys';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {setGroupUserRole} from '../../services/group-role.service.js';
import {isGroupCreator, getParticipantIdentityJids} from '../../utils/group-creator.js';
import {cleanJid} from '../../utils/jid.js';

type ParticipantWithAliases = GroupParticipant & {
    phoneNumber?: string | number | null;
    participantAlt?: string | null;
};

const MAX_ROLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 240;

export function getTargetJid(m: {mentionedJid?: string[]; quoted?: {sender?: string | null} | null}): string | null {
    return cleanJid(m.mentionedJid?.[0] || m.quoted?.sender || '');
}

export function parseRoleInput(text: string): {role: string; roleDescription: string | null} | null {
    const cleanText = text.replace(/@\d+/g, '').trim();
    if (!cleanText) return null;

    const separatorIndex = cleanText.indexOf('|');
    const role = (separatorIndex >= 0 ? cleanText.slice(0, separatorIndex) : cleanText).trim();
    const roleDescription = (separatorIndex >= 0 ? cleanText.slice(separatorIndex + 1) : '').trim() || null;
    if (!role) return null;
    return {role, roleDescription};
}

function isAdminParticipant(participant: ParticipantWithAliases): boolean {
    return participant.admin === 'admin'
        || participant.admin === 'superadmin'
        || participant.isAdmin === true
        || participant.isSuperAdmin === true;
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
    if (!target || !isAdminParticipant(target)) {
        return sdk.reply.message('group.setRole.targetNotAdmin');
    }
    const roleUserId = cleanJid(getParticipantIdentityJids(target).find(jid => jid.endsWith('@s.whatsapp.net')) || targetJid);

    const parsed = parseRoleInput(sdk.text);
    if (!parsed) return sdk.reply.message('group.setRole.missingRole');
    if (parsed.role.length > MAX_ROLE_LENGTH || (parsed.roleDescription?.length || 0) > MAX_DESCRIPTION_LENGTH) {
        return sdk.reply.message('group.setRole.tooLong', {roleMax: MAX_ROLE_LENGTH, descriptionMax: MAX_DESCRIPTION_LENGTH});
    }
    const {role, roleDescription} = parsed;

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
        description: roleDescription || '',
    }), mentions: [roleUserId]});
    }
});
