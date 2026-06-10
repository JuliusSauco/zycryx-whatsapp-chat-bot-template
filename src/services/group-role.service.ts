import {createHash} from 'crypto';
import type {GroupMetadata, GroupParticipant} from '@whiskeysockets/baileys';
import {repositories} from './data-source.js';
import {cleanJid, isLidJid, isUserJid} from '../utils/jid.js';
import {getGroupCreatorJids, getParticipantIdentityJids} from '../utils/group-creator.js';
import type {UserGroupRoleRecord} from '../ports/repositories.js';

type GroupParticipantWithAliases = GroupParticipant & {
    participantAlt?: string | null;
    phoneNumber?: string | number | null;
    notify?: string | null;
    name?: string | null;
};

function getPreferredUserJid(participant: GroupParticipantWithAliases): string | null {
    const jids = getParticipantIdentityJids(participant);
    return jids.find(isUserJid) || jids[0] || null;
}

function getParticipantLid(participant: GroupParticipantWithAliases): string | null {
    return getParticipantIdentityJids(participant).find(isLidJid) || null;
}

function getParticipantPhone(participant: GroupParticipantWithAliases, userId: string): string | null {
    const phoneNumber = participant.phoneNumber?.toString().replace(/[^\d]/g, '');
    if (phoneNumber) return phoneNumber;
    return isUserJid(userId) ? userId.split('@')[0] : null;
}

function getAdminRole(groupId: string, metadata: GroupMetadata, participant: GroupParticipantWithAliases): {
    role: string;
    roleDescription: string;
} {
    const creatorJids = getGroupCreatorJids(groupId, metadata);
    const participantJids = getParticipantIdentityJids(participant);
    const isFounder = participantJids.some(jid => creatorJids.includes(cleanJid(jid)));
    return isFounder
        ? {role: 'Founder', roleDescription: 'Founder'}
        : {role: 'Admin', roleDescription: 'Admin'};
}

function getAdminFallbackName(groupId: string): string {
    return `admin_${groupId.split('@')[0] || groupId}`;
}

function getParticipantAlias(groupId: string, participant: GroupParticipantWithAliases): string {
    return participant.notify || participant.name || getAdminFallbackName(groupId);
}

export async function registerGroupAdmins(groupId: string, metadata: GroupMetadata): Promise<number> {
    const admins = (metadata.participants || [])
        .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin' || participant.isAdmin || participant.isSuperAdmin) as GroupParticipantWithAliases[];

    let registered = 0;
    for (const admin of admins) {
        const userId = getPreferredUserJid(admin);
        if (!userId) continue;
        const {role, roleDescription} = getAdminRole(groupId, metadata, admin);
        const lid = getParticipantLid(admin);
        if (lid) {
            await repositories.users.clearLidFromOtherUsers(lid, userId);
        }
        await repositories.users.upsertRegisteredAdmin({
            id: userId,
            nombre: getParticipantAlias(groupId, admin),
            num: getParticipantPhone(admin, userId),
            lid,
            serialNumber: createHash('md5').update(userId).digest('hex'),
        });
        await repositories.userGroupRoles.insertDefaultIfMissing({
            groupId,
            userId,
            role,
            roleDescription,
        });
        registered += 1;
    }
    return registered;
}

export async function setGroupUserRole(input: {
    groupId: string;
    userId: string;
    role: string;
    roleDescription: string | null;
    updatedBy: string | null;
}): Promise<void> {
    await repositories.userGroupRoles.upsert(input);
}

export async function getGroupUserRole(groupId: string, userId: string): Promise<UserGroupRoleRecord | null> {
    return repositories.userGroupRoles.find(groupId, userId);
}

export async function getGroupParticipantRole(groupId: string, participant: GroupParticipant): Promise<UserGroupRoleRecord | null> {
    for (const jid of getParticipantIdentityJids(participant as GroupParticipantWithAliases)) {
        const role = await getGroupUserRole(groupId, jid);
        if (role) return role;
    }
    return null;
}

export async function listGroupUserRoles(groupId: string): Promise<UserGroupRoleRecord[]> {
    return repositories.userGroupRoles.listByGroup(groupId);
}
