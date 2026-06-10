import type {AccessMode} from '../types/config.js';

export function canUseAccessMode(mode: AccessMode, ctx: {isOwner?: boolean; isAdmin?: boolean; isGroupCreator?: boolean}): boolean {
    switch (mode) {
        case 'owner':
            return !!ctx.isOwner;
        case 'superadmin':
            return !!ctx.isOwner || !!ctx.isGroupCreator;
        case 'admin':
            return !!ctx.isOwner || !!ctx.isAdmin;
        default:
            return true;
    }
}

export function accessModeLabel(mode?: AccessMode | null): string {
    switch (mode || 'all') {
        case 'owner':
            return 'solo owners';
        case 'superadmin':
            return 'solo creador del grupo';
        case 'admin':
            return 'solo admins';
        default:
            return 'todos';
    }
}
