import type {AccessMode} from '../types/config.js';

export interface NsfwAccessSettings {
    modohorny?: boolean | null;
    nsfwAccessMode?: AccessMode | null;
}

export function canUseNsfw(settings: NsfwAccessSettings, ctx: {isOwner?: boolean; isAdmin?: boolean; isGroupCreator?: boolean}): boolean {
    void ctx;
    return settings.modohorny === true;
}
