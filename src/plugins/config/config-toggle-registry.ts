import type {ConfigurableFeatureKey, GroupBooleanFlag} from '../../domain/groups.js';

export interface GroupBooleanToggle {
    flag: GroupBooleanFlag;
    adminOnly: true;
}

export interface FamilyToggle {
    key: ConfigurableFeatureKey;
    label: string;
}

function aliases<T>(entries: Array<[readonly string[], T]>): Readonly<Record<string, T>> {
    return Object.freeze(Object.fromEntries(entries.flatMap(([names, value]) => names.map(name => [name, value]))));
}

export const GROUP_BOOLEAN_TOGGLES = aliases<GroupBooleanToggle>([
    [['detect', 'avisos'], {flag: 'detect', adminOnly: true}],
    [['antilink', 'antienlace'], {flag: 'antilink', adminOnly: true}],
    [['antilink2'], {flag: 'antilink2', adminOnly: true}],
    [['virustotal', 'virus', 'vt', 'antivirus'], {flag: 'virusTotal', adminOnly: true}],
    [['antiporn', 'antiporno', 'antinwfs'], {flag: 'antiporn', adminOnly: true}],
    [['autolevelup', 'auto-level', 'nivelauto'], {flag: 'autolevelup', adminOnly: true}],
    [['antifake'], {flag: 'antifake', adminOnly: true}],
    [['msglog', 'messagelog', 'registromsg', 'registrarmensajes'], {flag: 'messageLogging', adminOnly: true}],
]);

export const FAMILY_TOGGLES = aliases<FamilyToggle>([
    [['audios', 'audio'], {key: 'audio', label: 'audios'}],
    [['gifs', 'gif', 'reacciones'], {key: 'gifs', label: 'gifs/reacciones'}],
    [['juegos', 'games'], {key: 'games', label: 'juegos'}],
    [['herramientas', 'tools'], {key: 'tools', label: 'herramientas'}],
    [['rpg', 'economia', 'economía'], {key: 'rpg', label: 'rpg'}],
    [['store', 'tienda'], {key: 'store', label: 'tienda'}],
    [['descargas', 'downloads'], {key: 'downloads', label: 'descargas'}],
    [['buscadores', 'busquedas', 'búsquedas', 'search'], {key: 'search', label: 'buscadores'}],
    [['stickers', 'sticker'], {key: 'stickers', label: 'stickers'}],
    [['convertidores', 'converters', 'convertidor'], {key: 'converters', label: 'convertidores'}],
    [['diversion', 'diversión', 'fun', 'random'], {key: 'fun', label: 'diversion/random'}],
]);
