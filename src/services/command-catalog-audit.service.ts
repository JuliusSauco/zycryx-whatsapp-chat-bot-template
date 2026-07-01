import {getLoadedPlugins} from '../core/runtime-state.js';
import type {Plugin} from '../types/plugin.js';
import {getCommandCatalogMatch, type CommandCatalogEntry} from './command-catalog.service.js';

export type CommandCatalogAuditIssueType =
    | 'missing_catalog_entry'
    | 'permission_mismatch'
    | 'scope_mismatch';

export interface CommandCatalogAuditIssue {
    type: CommandCatalogAuditIssueType;
    pluginName: string;
    help: string;
    query: string;
    expected?: string;
    actual?: string;
}

export interface CommandCatalogAuditReport {
    pluginsChecked: number;
    helpEntriesChecked: number;
    missingEntries: number;
    permissionMismatches: number;
    scopeMismatches: number;
    issues: CommandCatalogAuditIssue[];
}

type AuditablePlugin = Plugin & {
    disabled?: boolean;
};

const ARGUMENT_PREFIXES = ['<', '[', '@', '*', '('];

export function auditCommandCatalog(plugins: Record<string, Plugin> = getLoadedPlugins()): CommandCatalogAuditReport {
    const issues: CommandCatalogAuditIssue[] = [];
    let pluginsChecked = 0;
    let helpEntriesChecked = 0;

    for (const [pluginName, plugin] of Object.entries(plugins)) {
        const auditable = plugin as AuditablePlugin;
        if (auditable.disabled) continue;

        const helpEntries = Array.isArray(plugin.help) ? plugin.help.filter(isNonEmptyString) : [];
        if (!helpEntries.length) continue;
        pluginsChecked++;

        for (const help of helpEntries) {
            const query = getAuditQuery(help);
            if (!query) continue;
            helpEntriesChecked++;

            const match = getCommandCatalogMatch(query);
            if (!match) {
                issues.push({type: 'missing_catalog_entry', pluginName, help, query});
                continue;
            }

            const expectedRole = match.entry.requiredRole;
            const actualRole = inferRequiredRole(plugin);
            if (expectedRole && expectedRole !== actualRole) {
                issues.push({
                    type: 'permission_mismatch',
                    pluginName,
                    help,
                    query,
                    expected: expectedRole,
                    actual: actualRole,
                });
            }

            const expectedScope = match.entry.scope;
            const actualScope = inferScope(plugin);
            if (expectedScope && expectedScope !== actualScope) {
                issues.push({
                    type: 'scope_mismatch',
                    pluginName,
                    help,
                    query,
                    expected: expectedScope,
                    actual: actualScope,
                });
            }
        }
    }

    return {
        pluginsChecked,
        helpEntriesChecked,
        missingEntries: issues.filter(issue => issue.type === 'missing_catalog_entry').length,
        permissionMismatches: issues.filter(issue => issue.type === 'permission_mismatch').length,
        scopeMismatches: issues.filter(issue => issue.type === 'scope_mismatch').length,
        issues,
    };
}

export function renderCommandCatalogAudit(report: CommandCatalogAuditReport, limit = 8): string {
    const totalIssues = report.issues.length;
    if (!totalIssues) {
        return [
            '✅ *Catalogo de comandos*',
            `*Plugins:* ${report.pluginsChecked}`,
            `*Entradas:* ${report.helpEntriesChecked}`,
            'Sin pendientes detectados.',
        ].join('\n');
    }

    const preview = report.issues
        .slice(0, limit)
        .map(issue => `• ${issue.query} (${shortPluginName(issue.pluginName)})`)
        .join('\n');
    const more = totalIssues > limit ? `\n+${totalIssues - limit} pendientes mas.` : '';

    return [
        '🧭 *Auditoria de comandos*',
        `*Plugins:* ${report.pluginsChecked} | *Entradas:* ${report.helpEntriesChecked}`,
        `*Sin catalogo:* ${report.missingEntries}`,
        `*Permisos:* ${report.permissionMismatches} | *Ambito:* ${report.scopeMismatches}`,
        '',
        '*Pendientes:*',
        preview + more,
    ].join('\n').trim();
}

export function getAuditQuery(help: string): string {
    const tokens = normalizeHelp(help)
        .split(/\s+/)
        .map(cleanToken)
        .filter(Boolean);
    if (!tokens.length) return '';

    const candidates = buildCandidates(tokens);
    const hasAlternatives = tokens[1]?.includes('/') || false;
    const primary = candidates[0];
    const primaryMatch = primary ? getCommandCatalogMatch(primary) : undefined;
    if (primary && primaryMatch && primaryMatch.source !== 'base') return primary;
    if (primary?.includes(' ') && !hasAlternatives) return primary;

    const exactMatch = candidates.slice(1).find(candidate => {
        const match = getCommandCatalogMatch(candidate);
        return match && match.source !== 'base';
    });
    if (exactMatch) return exactMatch;

    const base = tokens[0];
    if (base && getCommandCatalogMatch(base)) return base;
    return candidates[0] || tokens[0];
}

function buildCandidates(tokens: string[]): string[] {
    const [first, second, third] = tokens;
    const candidates: string[] = [];
    if (!first) return candidates;

    if (second?.includes('/')) {
        for (const option of second.split('/').filter(Boolean)) {
            candidates.push(`${first} ${option}`);
        }
        candidates.push(first);
        return unique(candidates);
    }

    if (second && third?.startsWith('--') && isConcreteToken(second)) {
        candidates.push(`${first} ${second} ${third}`);
    }
    if (second && isConcreteToken(second)) {
        candidates.push(`${first} ${second}`);
    }
    candidates.push(first);

    return unique(candidates);
}

function normalizeHelp(help: string): string {
    return help
        .replace(/[`*_]/g, '')
        .replace(/^[#./!]+/, '')
        .trim()
        .toLowerCase();
}

function cleanToken(token: string): string {
    return token.replace(/^[#./!]+/, '').replace(/[,:;]+$/g, '').trim();
}

function isConcreteToken(token: string): boolean {
    if (!token) return false;
    if (ARGUMENT_PREFIXES.some(prefix => token.startsWith(prefix))) return false;
    if (token.includes('|')) return false;
    if (/^\d+$/.test(token)) return false;
    return true;
}

function inferRequiredRole(plugin: Plugin): Exclude<CommandCatalogEntry['requiredRole'], undefined> {
    if (plugin.owner || plugin.rowner) return 'owner';
    if (plugin.admin || plugin.botAdmin) return 'admin';
    return 'member';
}

function inferScope(plugin: Plugin): Exclude<CommandCatalogEntry['scope'], undefined> {
    if (plugin.group) return 'group';
    if (plugin.private) return 'private';
    return 'both';
}

function shortPluginName(pluginName: string): string {
    const parts = pluginName.split(/[\\/]/);
    return parts[parts.length - 1] || pluginName;
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}
