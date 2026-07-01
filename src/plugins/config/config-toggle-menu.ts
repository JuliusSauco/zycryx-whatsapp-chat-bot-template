import type {AccessMode, AutoAcceptMode, AutoresponderTrigger, GreetingHidetagMode, GroupSettings, SubbotConfig} from '../../types/config.js';

export type ToggleSectionKey = 'saludos' | 'moderacion' | 'acceso' | 'familias' | 'ia' | 'adulto' | 'subbot';

export interface ToggleMenuState {
    prefix: string;
    command: string;
    isGroup: boolean;
    enabledIcon: string;
    disabledIcon: string;
    notGroupIcon: string;
    group: Partial<GroupSettings>;
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
        summary: state => `juegos ${accessModeLabel(state.group.gamesAccessMode)} | descargas ${accessModeLabel(state.group.downloadsAccessMode)} | rpg ${accessModeLabel(state.group.rpgAccessMode)}`,
        items: state => [
            featureItem(state, 'Juegos', 'juegos', state.group.gamesAccessMode),
            featureItem(state, 'Herramientas', 'herramientas', state.group.toolsAccessMode),
            featureItem(state, 'RPG', 'rpg', state.group.rpgAccessMode),
            featureItem(state, 'Descargas', 'descargas', state.group.downloadsAccessMode),
            featureItem(state, 'Buscadores', 'buscadores', state.group.searchAccessMode),
            featureItem(state, 'Stickers', 'stickers', state.group.stickersAccessMode),
            featureItem(state, 'Convertidores', 'convertidores', state.group.convertersAccessMode),
            featureItem(state, 'Diversion/random', 'diversion', state.group.funAccessMode),
        ],
    },
    {
        key: 'adulto',
        title: 'Adulto',
        description: 'NSFW, permisos adultos y horario.',
        summary: state => `NSFW ${getStatus(state, 'modohorny')} | ${accessModeLabel(state.group.nsfwAccessMode)}`,
        items: state => [
            {
                label: 'Modo horny / NSFW',
                status: `${getStatus(state, 'modohorny')} (${accessModeLabel(state.group.nsfwAccessMode)})`,
                minimumRole: 'superadmin',
                commands: [
                    `${state.prefix}enable nsfw --all`,
                    `${state.prefix}enable nsfw --admin`,
                    `${state.prefix}enable nsfw --superadmin`,
                    {text: `${state.prefix}enable nsfw --owner`, minimumRole: 'owner'},
                    `${state.prefix}disable nsfw`,
                ],
            },
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

function featureItem(state: ToggleMenuState, label: string, command: string, mode?: AccessMode | null): ToggleItem {
    return {
        label,
        status: accessModeLabel(mode),
        commands: [
            {text: `${state.prefix}enable ${command} --all`, minimumRole: 'admin'},
            {text: `${state.prefix}enable ${command} --admin`, minimumRole: 'admin'},
            {text: `${state.prefix}enable ${command} --superadmin`, minimumRole: 'superadmin'},
            {text: `${state.prefix}enable ${command} --owner`, minimumRole: 'owner'},
            {text: `${state.prefix}disable ${command}`, minimumRole: 'admin'},
        ],
    };
}
