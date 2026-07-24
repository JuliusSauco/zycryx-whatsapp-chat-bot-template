import type {AccessMode} from '../types/config.js';
import {canUseAccessMode} from './access-mode.js';

export interface NsfwAccessSettings {
    modohorny?: boolean | null;
    nsfwAccessMode?: AccessMode | null;
    nsfwGifEnabled?: boolean | null;
    nsfwGifAccessMode?: AccessMode | null;
}

export function canUseNsfw(settings: NsfwAccessSettings, ctx: {isOwner?: boolean; isAdmin?: boolean; isGroupCreator?: boolean}): boolean {
    return settings.modohorny === true && canUseAccessMode(settings.nsfwAccessMode || 'owner', ctx);
}

export function canUseNsfwGifs(settings: NsfwAccessSettings, ctx: {isOwner?: boolean; isAdmin?: boolean; isGroupCreator?: boolean}): boolean {
    return settings.nsfwGifEnabled === true && canUseAccessMode(settings.nsfwGifAccessMode || 'owner', ctx);
}
