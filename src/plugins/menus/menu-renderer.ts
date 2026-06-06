import {definePlugin} from '../../core/define-plugin.js';
import type {PluginDefinition} from '../../core/define-plugin.js';
import type {Plugin} from '../../types/plugin.js';
import type {BotMessage} from '../../types/message.js';
import type {PluginContext} from '../../types/context.js';
import {getCommandMetadata} from './menu-command-metadata.js';

type MenuPlugin = Plugin & {
    disabled?: boolean;
    premium?: boolean;
};

interface HelpEntry {
    command: string;
    tags: string[];
    prefix: boolean;
    limit?: number;
    premium?: boolean;
    owner?: boolean;
    rowner?: boolean;
    admin?: boolean;
    botAdmin?: boolean;
    group?: boolean;
    pluginName?: string;
}

export interface MenuDefinition {
    title: string;
    help: string[];
    command: RegExp | string | string[];
    tags: string[];
    intro: string;
    pluginTags: string[];
    include?: (entry: HelpEntry) => boolean;
    group?: boolean;
    owner?: boolean;
    register?: boolean;
    manualGuard?: (m: BotMessage, ctx: PluginContext) => Promise<string | null> | string | null;
}

export async function sendRenderedMenu(m: BotMessage, ctx: PluginContext, definition: MenuDefinition): Promise<void> {
    const denied = definition.manualGuard ? await definition.manualGuard(m, ctx) : null;
    if (denied) {
        await m.reply(denied);
        return;
    }

    const text = renderMenuText(definition, ctx.usedPrefix || '#');
    await ctx.conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            mentionedJid: await ctx.conn.parseMention(text),
        },
    }, {quoted: m});
}

export function createMenuPlugin(definition: MenuDefinition): Plugin {
    const pluginDefinition: PluginDefinition = {
        help: definition.help,
        tags: definition.tags,
        command: definition.command,
        group: definition.group,
        owner: definition.owner,
        register: definition.register ?? true,
        async execute(m, ctx) {
            await sendRenderedMenu(m, ctx, definition);
        },
    };

    return definePlugin(pluginDefinition);
}

export function renderMenuText(definition: MenuDefinition, usedPrefix: string): string {
    const entries = getHelpEntries(definition.pluginTags, definition.include);
    const lines = entries.map((entry) => renderEntry(entry, usedPrefix));
    const body = lines.length
        ? lines.join('\n')
        : '🔹 No hay comandos activos para esta categoría.';

    return [
        `\`<${definition.title}/>\``,
        '',
        `> ${definition.intro}`,
        '',
        body,
        '',
        '*🅛🅞🅛🅘🅑🅞🅣-🅜🅓*',
    ].join('\n').trim();
}

function getHelpEntries(tags: string[], include?: (entry: HelpEntry) => boolean): HelpEntry[] {
    const plugins = Object.entries(global.plugins as Record<string, MenuPlugin>)
        .filter(([, plugin]) => !plugin.disabled);

    const entries = plugins.flatMap(([pluginName, plugin]) => {
        const pluginTags = Array.isArray(plugin.tags) ? plugin.tags.filter(isString) : [];
        const hasRequestedTag = pluginTags.some((tag) => tags.includes(tag));
        if (!hasRequestedTag) return [];

        const help = Array.isArray(plugin.help) ? plugin.help.filter(isString) : [];
        return help.map((command) => ({
            command,
            tags: pluginTags,
            prefix: !plugin.customPrefix,
            limit: plugin.limit,
            premium: plugin.premium,
            owner: plugin.owner,
            rowner: plugin.rowner,
            admin: plugin.admin,
            botAdmin: plugin.botAdmin,
            group: plugin.group,
            pluginName,
        }));
    });

    return entries
        .filter((entry) => include ? include(entry) : true)
        .sort((a, b) => a.command.localeCompare(b.command, 'es'));
}

function renderEntry(entry: HelpEntry, usedPrefix: string): string {
    const metadata = getCommandMetadata(entry.command, entry.tags);
    const command = entry.prefix ? `${usedPrefix}${metadata.usage}` : metadata.usage;
    const markers = [
        entry.limit ? '💎' : '',
        entry.premium ? '💵' : '',
        entry.owner || entry.rowner ? '👑' : '',
        entry.admin || entry.botAdmin ? '🛡️' : '',
    ].filter(Boolean).join(' ');
    const suffix = markers ? ` ${markers}` : '';
    return `${metadata.emoji} *${command}* — ${metadata.description}${suffix}`;
}

function isString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}
