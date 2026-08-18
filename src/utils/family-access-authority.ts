import type {AccessMode} from '../types/config.js';
import type {FamilyAccessRule} from '../domain/groups.js';

export function getFamilyManagerLevel(actor: {isOwner: boolean; isGroupCreator: boolean; isAdmin: boolean}): number {
    return actor.isOwner ? 3 : actor.isGroupCreator ? 2 : actor.isAdmin ? 1 : 0;
}

export function getFamilyModeLevel(mode: AccessMode): number {
    return mode === 'owner' ? 3 : mode === 'superadmin' ? 2 : 1;
}

export function getRequiredFamilyManagerLevel(current: FamilyAccessRule, next: FamilyAccessRule): number {
    if (!next.enabled) return 3;
    return Math.max(current.enabled ? getFamilyModeLevel(current.accessMode) : 3, getFamilyModeLevel(next.accessMode));
}
