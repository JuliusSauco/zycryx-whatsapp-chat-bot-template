import type {AccessMode} from '../types/config.js';
import type {ConfigurableFeatureKey, FamilyAccessMap, FamilyAccessRule} from '../domain/groups.js';

export const CONFIGURABLE_FEATURES: readonly ConfigurableFeatureKey[] = [
    'games', 'tools', 'rpg', 'roleplay', 'store', 'downloads', 'search', 'stickers',
    'converters', 'fun', 'audio', 'gifs', 'nsfw', 'nsfw-gifs',
];

export function defaultFamilyAccess(feature: ConfigurableFeatureKey): FamilyAccessRule {
    if (feature === 'audio') return {enabled: false, accessMode: 'all'};
    if (feature === 'nsfw' || feature === 'nsfw-gifs') return {enabled: false, accessMode: 'owner'};
    return {enabled: true, accessMode: 'all'};
}

export function createDefaultFamilyAccessMap(): FamilyAccessMap {
    return Object.fromEntries(CONFIGURABLE_FEATURES.map(feature => [feature, defaultFamilyAccess(feature)])) as FamilyAccessMap;
}

export function mergeFamilyAccessRules(
    rules: Array<{target: ConfigurableFeatureKey; rule: FamilyAccessRule}>,
): FamilyAccessMap {
    const result = createDefaultFamilyAccessMap();
    for (const {target, rule} of rules) result[target] = rule;
    return result;
}

export function normalizeFamilyAccessMode(value: string | null | undefined, fallback: AccessMode = 'all'): AccessMode {
    return value === 'admin' || value === 'superadmin' || value === 'owner' || value === 'all' ? value : fallback;
}

export function isConfigurableFeature(value: string): value is ConfigurableFeatureKey {
    return CONFIGURABLE_FEATURES.includes(value as ConfigurableFeatureKey);
}

export function familyAccessLabel(feature: ConfigurableFeatureKey): string {
    const labels: Record<ConfigurableFeatureKey, string> = {
        games: 'juegos', tools: 'herramientas', rpg: 'RPG/economía', roleplay: 'juegos de rol', store: 'tienda', downloads: 'descargas',
        search: 'búsquedas', stickers: 'stickers', converters: 'convertidores', fun: 'diversión/random',
        audio: 'audios automáticos', gifs: 'GIFs/reacciones', nsfw: 'contenido NSFW', 'nsfw-gifs': 'GIFs NSFW',
    };
    return labels[feature];
}
