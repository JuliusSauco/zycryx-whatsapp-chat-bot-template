import type {AccessMode, AutoAcceptMode, AutoresponderTrigger, GreetingHidetagMode, GroupSettings, SubbotConfig} from '../../types/config.js';
import type {ConfigurableFeatureKey, FamilyAccessMap} from '../../domain/groups.js';
import {defaultFamilyAccess} from '../../utils/family-access.js';

export type ToggleSectionKey = 'saludos' | 'moderacion' | 'acceso' | 'familias' | 'ia' | 'adulto' | 'subbot';

export interface ToggleMenuState {
    prefix: string;
    command: string;
    isGroup: boolean;
    enabledIcon: string;
    disabledIcon: string;
    notGroupIcon: string;
    group: Partial<GroupSettings>;
    familyAccess: FamilyAccessMap;
    subbot: Partial<SubbotConfig> | null;
    isSubbot: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    isGroupCreator: boolean;
}

interface ToggleItem {
    label: string;
    status: string;
    description?: string;
    minimumRole?: TogglePermission;
    commands: ToggleCommand[];
}

interface ToggleSection {
    key: ToggleSectionKey;
    navKey?: string;
    title: string;
    description: string;
    summary: (state: ToggleMenuState) => string;
    items: (state: ToggleMenuState) => ToggleItem[];
}

type TogglePermission = 'member' | 'admin' | 'superadmin' | 'owner';
type ToggleCommand = string | {
    text: string;
    minimumRole?: TogglePermission;
};

const DEFAULT_ENABLED_FLAGS: Partial<Record<keyof GroupSettings, boolean>> = {
    welcome: true,
    bye: true,
    detect: true,
    autoresponder: true,
};

export function getToggleSectionKey(rawType?: string): ToggleSectionKey | null {
    switch ((rawType || '').toLowerCase()) {
        case 'saludos':
        case 'greetings':
        case 'bienvenidas':
            return 'saludos';
        case 'moderacion':
        case 'moderación':
        case 'mod':
        case 'seguridad':
            return 'moderacion';
        case 'acceso':
        case 'access':
        case 'permisos':
            return 'acceso';
        case 'familias':
        case 'familia':
        case 'comandos':
            return 'familias';
        case 'ia':
        case 'ai':
        case 'inteligencia':
            return 'ia';
        case 'adulto':
        case 'nsfw':
        case 'nsfwmenu':
        case 'horny':
            return 'adulto';
        case 'subbot':
        case 'subbots':
        case 'owner':
            return 'subbot';
        default:
            return null;
    }
}

export function renderToggleMenu(state: ToggleMenuState, sectionKey?: ToggleSectionKey | null): string {
    const section = sectionKey ? sections.find(item => item.key === sectionKey) : null;
    return section ? renderSection(state, section) : renderSummary(state);
}

export function renderConfigOnboarding(prefix: string): string {
    return [
        '╭━━━〔 ⚙️ `PERMISOS DEL BOT` 〕━━━╮',
        '',
        '👋 *¿Qué puedes configurar?*',
        'Los comandos se organizan por *familias*. Puedes activarlas, apagarlas o decidir qué rol puede utilizarlas en este grupo.',
        '',
        '🧭 *Niveles de acceso*',
        '👥 `--all` Todos los participantes.',
        '🛡️ `--admin` Administradores del grupo, creador y owners.',
        '👑 `--superadmin` Creador del grupo y owners.',
        '🤖 `--owner` Solo owners del bot.',
        '',
        '🧩 *Cómo configurar una familia*',
        `✅ Activar para todos: *${prefix}enable juegos --all*`,
        `🛡️ Limitar a admins: *${prefix}enable juegos --admin*`,
        `🔒 Apagar por completo: *${prefix}disable juegos*`,
        '',
        '🎞️ *GIFs y contenido adulto*',
        `• *${prefix}enable gifs --all* habilita las reacciones normales.`,
        `• *${prefix}enable nsfwgif --owner* habilita sus variantes explícitas solo para owners.`,
        `• *${prefix}enable nsfwmenu --owner* habilita el menú y los comandos NSFW separados.`,
        'Si una reacción solo tiene GIF NSFW y no tienes permiso, el bot no enviará nada.',
        '',
        '📚 *Explora la configuración*',
        `🗂️ *${prefix}config comandos* — familias y estado actual.`,
        `🔞 *${prefix}config adulto* — GIFs NSFW y menú NSFW.`,
        `🔐 *${prefix}config acceso* — acceso general al bot.`,
        `🛡️ *${prefix}config seguridad* — moderación y protección.`,
        `⚙️ *${prefix}config* — resumen completo.`,
        '',
        '💡 *Consejo:* empieza con `--all` y restringe únicamente las familias sensibles.',
        '',
        '╰━━━━━━━━━━━━━━━━━━━━╯',
    ].join('\n');
}

function renderSummary(state: ToggleMenuState): string {
    const sectionLines = sections
        .filter(section => getVisibleItems(section, state).length > 0)
        .map(section => `${sectionIcon(section.key)} *${section.title}*\n${section.description}\n${state.prefix}config ${section.navKey || section.key}\nEstado: ${section.summary(state)}`);
    return [
        '*『 CONFIGURACION DEL BOT 』*',
        '',
        '✅ activo | ❌ apagado | ⚠️ no aplica',
        '',
        '*Secciones disponibles*',
        sectionLines.length ? sectionLines.join('\n\n') : 'No tienes configuraciones disponibles.',
        '',
        `Ver detalle: ${state.prefix}config seguridad`,
        `Guía de permisos: ${state.prefix}config --info`,
        `Cambiar algo: ${state.prefix}enable antilink`,
    ].join('\n').trim();
}

function renderSection(state: ToggleMenuState, section: ToggleSection): string {
    const visibleItems = getVisibleItems(section, state);
    const itemText = visibleItems
        .map(item => renderItem(item))
        .join('\n\n');

    return [
        `*『 ${section.title.toUpperCase()} 』*`,
        section.description,
        '',
        'Usa enable/disable para cambiar opciones.',
        '',
        itemText || 'No tienes configuraciones disponibles en esta seccion.',
        '',
        `Volver: ${state.prefix}config`,
    ].join('\n').trim();
}

function renderItem(item: ToggleItem): string {
    const description = item.description ? `\n${item.description}` : '';
    const commands = item.commands.map(command => `• ${typeof command === 'string' ? command : command.text}`).join('\n');
    return `*${item.label}* ${item.status}${description}\n${commands}`;
}

function getVisibleItems(section: ToggleSection, state: ToggleMenuState): ToggleItem[] {
    return section.items(state)
        .filter(item => canSee(state, item.minimumRole || 'member'))
        .map(item => ({
            ...item,
            commands: item.commands.filter(command => canSee(state, typeof command === 'string' ? 'member' : command.minimumRole || item.minimumRole || 'member')),
        }))
        .filter(item => item.commands.length > 0);
}

function canSee(state: ToggleMenuState, minimumRole: TogglePermission): boolean {
    switch (minimumRole) {
        case 'owner':
            return state.isOwner;
        case 'superadmin':
            return state.isOwner || state.isGroupCreator;
        case 'admin':
            return state.isOwner || state.isAdmin;
        default:
            return true;
    }
}

function getStatus(state: ToggleMenuState, flag: keyof GroupSettings): string {
    if (!state.isGroup) return state.notGroupIcon;
    const value = state.group[flag];
    return (typeof value === 'boolean' ? value : DEFAULT_ENABLED_FLAGS[flag]) ? state.enabledIcon : state.disabledIcon;
}

function getSubbotStatus(state: ToggleMenuState, enabled?: boolean | null): string {
    return state.isSubbot ? (enabled ? state.enabledIcon : state.disabledIcon) : state.notGroupIcon;
}

function greetingModeLabel(mode?: GreetingHidetagMode | null, legacyHidetag?: boolean): string {
    const normalized = mode || (legacyHidetag ? 'all' : 'off');
    if (normalized === 'admin') return 'admins';
    if (normalized === 'all') return 'todos';
    return 'sin hidetag';
}

function autoAcceptModeLabel(mode?: AutoAcceptMode | null): string {
    switch (mode || 'off') {
        case 'on':
            return 'activo';
        case 'on_hidetag_admin':
            return 'activo + admins';
        case 'on_hidetag_all':
            return 'activo + todos';
        case 'off_hidetag_admin':
            return 'apagado + avisa admins';
        case 'off_hidetag_all':
            return 'apagado + avisa todos';
        default:
            return 'apagado';
    }
}

function accessModeLabel(mode?: AccessMode | null, legacyAdminMode?: boolean): string {
    switch (mode || (legacyAdminMode ? 'admin' : 'all')) {
        case 'owner':
            return 'solo owners';
        case 'superadmin':
            return 'solo creador';
        case 'admin':
            return 'solo admins';
        default:
            return 'todos';
    }
}

function autoresponderTriggerLabel(trigger?: AutoresponderTrigger | null): string {
    return trigger === 'all' ? 'todos los mensajes' : 'mencion/gatillo';
}

function sectionIcon(key: ToggleSectionKey): string {
    switch (key) {
        case 'saludos':
            return '👋';
        case 'moderacion':
            return '🛡️';
        case 'acceso':
            return '🔐';
        case 'familias':
            return '🗂️';
        case 'ia':
            return '🧠';
        case 'adulto':
            return '🔞';
        case 'subbot':
            return '✨';
    }
}

const sections: ToggleSection[] = [
    {
        key: 'saludos',
        title: 'Saludos',
        description: 'Bienvenida, despedida e hidetag.',
        summary: state => `welcome ${getStatus(state, 'welcome')} | bye ${getStatus(state, 'bye')}`,
        items: state => [
            {
                label: 'Bienvenida',
                status: `${getStatus(state, 'welcome')} (${greetingModeLabel(state.group.welcomeHidetagMode, state.group.welcomeHidetag)})`,
                minimumRole: 'admin',
                commands: [
                    `${state.prefix}enable welcome`,
                    `${state.prefix}enable welcome --hidetagadmin`,
                    `${state.prefix}enable welcome --hidetag`,
                    `${state.prefix}disable welcome`,
                    `${state.prefix}disable welcome --hidetag`,
                ],
            },
            {
                label: 'Despedida',
                status: `${getStatus(state, 'bye')} (${greetingModeLabel(state.group.byeHidetagMode, state.group.byeHidetag)})`,
                minimumRole: 'admin',
                commands: [
                    `${state.prefix}enable bye`,
                    `${state.prefix}enable bye --hidetagadmin`,
                    `${state.prefix}enable bye --hidetag`,
                    `${state.prefix}disable bye`,
                    `${state.prefix}disable bye --hidetag`,
                ],
            },
        ],
    },
    {
        key: 'moderacion',
        navKey: 'seguridad',
        title: 'Seguridad',
        description: 'Antilink, antifake, avisos, registros y solicitudes.',
        summary: state => `links ${getStatus(state, 'antilink')}/${getStatus(state, 'antilink2')} | seguridad ${getStatus(state, 'antifake')}`,
        items: state => [
            switchItem(state, 'Detectar avisos', 'detect', getStatus(state, 'detect')),
            switchItem(state, 'Antilink', 'antilink', getStatus(state, 'antilink')),
            switchItem(state, 'Antilink2', 'antilink2', getStatus(state, 'antilink2')),
            switchItem(state, 'Antifake', 'antifake', getStatus(state, 'antifake')),
            switchItem(state, 'VirusTotal', 'virustotal', getStatus(state, 'virusTotal')),
            switchItem(state, 'Registro mensajes', 'registromsg', getStatus(state, 'messageLogging')),
            {
                label: 'Autoaceptar',
                status: state.isGroup ? autoAcceptModeLabel(state.group.autoAcceptMode) : state.notGroupIcon,
                minimumRole: 'admin',
                commands: [
                    `${state.prefix}enable autoaceptar`,
                    `${state.prefix}enable autoaceptar --hidetagadmin`,
                    `${state.prefix}enable autoaceptar --hidetag`,
                    `${state.prefix}disable autoaceptar`,
                ],
            },
        ],
    },
    {
        key: 'acceso',
        title: 'Acceso del bot',
        description: 'Define quienes pueden usar comandos del bot.',
        summary: state => state.isGroup ? accessModeLabel(state.group.botAccessMode, state.group.modoadmin) : state.notGroupIcon,
        items: state => [
            {
                label: 'Comandos del bot',
                status: state.isGroup ? accessModeLabel(state.group.botAccessMode, state.group.modoadmin) : state.notGroupIcon,
                commands: [
                    {text: `${state.prefix}enable bot --all`, minimumRole: 'admin'},
                    {text: `${state.prefix}enable bot --admin`, minimumRole: 'admin'},
                    {text: `${state.prefix}enable bot --superadmin`, minimumRole: 'superadmin'},
                    {text: `${state.prefix}enable bot --owner`, minimumRole: 'owner'},
                    {text: `${state.prefix}disable bot`, minimumRole: 'admin'},
                ],
            },
        ],
    },
    {
        key: 'ia',
        title: 'IA y autoresponder',
        description: 'Autoresponder, trigger, prompt y memoria.',
        summary: state => `${getStatus(state, 'autoresponder')} | ${accessModeLabel(state.group.autoresponderMode)} | ${autoresponderTriggerLabel(state.group.autoresponderTrigger)}`,
        items: state => [
            {
                label: 'Autoresponder',
                status: `${getStatus(state, 'autoresponder')} (${accessModeLabel(state.group.autoresponderMode)})`,
                commands: [
                    {text: `${state.prefix}enable autoresponder --all`, minimumRole: 'admin'},
                    {text: `${state.prefix}enable autoresponder --admin`, minimumRole: 'admin'},
                    {text: `${state.prefix}enable autoresponder --superadmin`, minimumRole: 'superadmin'},
                    {text: `${state.prefix}enable autoresponder --owner`, minimumRole: 'owner'},
                    {text: `${state.prefix}disable autoresponder`, minimumRole: 'admin'},
                ],
            },
            {
                label: 'Trigger autoresponder',
                status: autoresponderTriggerLabel(state.group.autoresponderTrigger),
                minimumRole: 'admin',
                commands: [
                    `${state.prefix}enable autoresponder --triggerall`,
                    `${state.prefix}disable autoresponder --triggerall`,
                    `${state.prefix}enable autoresponder --mention`,
                ],
            },
            {
                label: 'Prompt y memoria',
                status: '',
                minimumRole: 'admin',
                commands: [
                    `${state.prefix}setprompt <texto|preset>`,
                    `${state.prefix}resetai`,
                    `${state.prefix}timeIA 2h`,
                ],
            },
        ],
    },
    {
        key: 'familias',
        navKey: 'comandos',
        title: 'Comandos',
        description: 'Permisos por familia: juegos, descargas, RPG y mas.',
        summary: state => `juegos ${familyStatus(state, 'games')} | descargas ${familyStatus(state, 'downloads')} | rpg ${familyStatus(state, 'rpg')}`,
        items: state => [
            featureItem(state, 'Juegos', 'juegos', 'games'),
            featureItem(state, 'Herramientas', 'herramientas', 'tools'),
            featureItem(state, 'RPG', 'rpg', 'rpg'),
            featureItem(state, 'Descargas', 'descargas', 'downloads'),
            featureItem(state, 'Buscadores', 'buscadores', 'search'),
            featureItem(state, 'Stickers', 'stickers', 'stickers'),
            featureItem(state, 'Convertidores', 'convertidores', 'converters'),
            featureItem(state, 'Diversion/random', 'diversion', 'fun'),
            featureItem(state, 'Audios automáticos', 'audios', 'audio'),
            featureItem(state, 'GIFs y reacciones', 'gifs', 'gifs'),
        ],
    },
    {
        key: 'adulto',
        title: 'Adulto',
        description: 'Menú/contenido y GIFs NSFW con activación y permisos independientes.',
        summary: state => `menú ${familyStatus(state, 'nsfw')} | GIFs ${familyStatus(state, 'nsfw-gifs')}`,
        items: state => [
            featureItem(state, 'Menú y contenido NSFW', 'nsfwmenu', 'nsfw'),
            featureItem(state, 'GIFs NSFW de menu3', 'nsfwgif', 'nsfw-gifs'),
            {label: 'Horario NSFW', status: '', minimumRole: 'superadmin', commands: [`${state.prefix}sethorario 23:00-06:00`]},
        ],
    },
    {
        key: 'subbot',
        title: 'Subbot y owner',
        description: 'Privado y llamadas del subbot.',
        summary: state => `privado ${getSubbotStatus(state, state.subbot?.anti_private)} | llamadas ${getSubbotStatus(state, state.subbot?.anti_call)}`,
        items: state => [
            switchItem(state, 'Antiprivado', 'antiprivate', getSubbotStatus(state, state.subbot?.anti_private), 'owner'),
            switchItem(state, 'Antillamadas', 'anticall', getSubbotStatus(state, state.subbot?.anti_call), 'owner'),
        ],
    },
];

function switchItem(state: ToggleMenuState, label: string, command: string, status: string, minimumRole: TogglePermission = 'admin'): ToggleItem {
    return {
        label,
        status,
        minimumRole,
        commands: [
            `${state.prefix}enable ${command}`,
            `${state.prefix}disable ${command}`,
        ],
    };
}

function familyStatus(state: ToggleMenuState, feature: ConfigurableFeatureKey): string {
    const rule = state.familyAccess[feature] || defaultFamilyAccess(feature);
    return rule.enabled ? accessModeLabel(rule.accessMode) : 'desactivada';
}

function featureItem(state: ToggleMenuState, label: string, command: string, feature: ConfigurableFeatureKey): ToggleItem {
    const rule = state.familyAccess[feature] || defaultFamilyAccess(feature);
    const currentRole: TogglePermission = !rule.enabled ? 'owner' : permissionForMode(rule.accessMode);
    return {
        label,
        status: familyStatus(state, feature),
        commands: [
            {text: `${state.prefix}enable ${command} --all`, minimumRole: maxPermission(currentRole, 'admin')},
            {text: `${state.prefix}enable ${command} --admin`, minimumRole: maxPermission(currentRole, 'admin')},
            {text: `${state.prefix}enable ${command} --superadmin`, minimumRole: maxPermission(currentRole, 'superadmin')},
            {text: `${state.prefix}enable ${command} --owner`, minimumRole: 'owner'},
            {text: `${state.prefix}disable ${command}`, minimumRole: 'owner'},
        ],
    };
}

function permissionForMode(mode: AccessMode): TogglePermission {
    return mode === 'owner' ? 'owner' : mode === 'superadmin' ? 'superadmin' : 'admin';
}

function maxPermission(left: TogglePermission, right: TogglePermission): TogglePermission {
    const ranks: Record<TogglePermission, number> = {member: 0, admin: 1, superadmin: 2, owner: 3};
    return ranks[left] >= ranks[right] ? left : right;
}
