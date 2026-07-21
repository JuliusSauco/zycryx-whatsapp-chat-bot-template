import type {AccessMode} from '../types/config.js';
import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';
import {canUseAccessMode} from '../utils/access-mode.js';

import type {ConfigurableFeatureKey} from '../domain/groups.js';

export const featureAccessGuard: Guard = async ({ctx, plugin}) => {
    if (!ctx.isGroup) return null;

    const feature = plugin.feature;
    if (!feature || feature === 'nsfw') return null;

    const mode = getFeatureMode(ctx.groupSettings, feature);
    if (canUseAccessMode(mode, ctx)) return null;
    return SILENT_REJECT;
};

function getFeatureMode(settings: {
    gamesAccessMode?: AccessMode;
    toolsAccessMode?: AccessMode;
    rpgAccessMode?: AccessMode;
    downloadsAccessMode?: AccessMode;
    searchAccessMode?: AccessMode;
    stickersAccessMode?: AccessMode;
    convertersAccessMode?: AccessMode;
    funAccessMode?: AccessMode;
}, feature: ConfigurableFeatureKey): AccessMode {
    switch (feature) {
        case 'games':
            return settings.gamesAccessMode || 'all';
        case 'tools':
            return settings.toolsAccessMode || 'all';
        case 'rpg':
            return settings.rpgAccessMode || 'all';
        case 'downloads':
            return settings.downloadsAccessMode || 'all';
        case 'search':
            return settings.searchAccessMode || 'all';
        case 'stickers':
            return settings.stickersAccessMode || 'all';
        case 'converters':
            return settings.convertersAccessMode || 'all';
        case 'fun':
            return settings.funAccessMode || 'all';
    }
}
