import type {AccessMode} from '../types/config.js';
import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';
import {canUseAccessMode} from '../utils/access-mode.js';

import type {ConfigurableFeatureKey} from '../ports/repositories.js';

const FEATURE_TAGS: Record<ConfigurableFeatureKey, string[]> = {
    games: ['game'],
    tools: ['tools'],
    rpg: ['econ', 'gacha', 'rg', 'rpg', 'hot'],
    downloads: ['downloader'],
    search: ['buscadores'],
    stickers: ['sticker'],
    converters: ['convertidor'],
    fun: ['fun', 'randow'],
};

export const featureAccessGuard: Guard = async ({ctx, plugin}) => {
    if (!ctx.isGroup) return null;

    const feature = getPluginFeature(plugin.tags || []);
    if (!feature) return null;

    const mode = getFeatureMode(ctx.groupSettings, feature);
    if (canUseAccessMode(mode, ctx)) return null;
    return SILENT_REJECT;
};

function getPluginFeature(tags: string[]): ConfigurableFeatureKey | null {
    for (const [feature, featureTags] of Object.entries(FEATURE_TAGS) as Array<[ConfigurableFeatureKey, string[]]>) {
        if (tags.some(tag => featureTags.includes(tag))) return feature;
    }
    return null;
}

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
