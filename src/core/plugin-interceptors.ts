import {logError} from '../lib/logger.js';
import type {BeforePluginContext} from '../types/context.js';
import type {BotMessage} from '../types/message.js';
import type {InterceptorResult, Plugin, PluginInterceptor} from '../types/plugin.js';

export interface InterceptorPipelineResult {
    handled: boolean;
    rejectionMessage?: string;
}

export async function runPluginInterceptors(input: {
    plugins: Plugin[];
    message: BotMessage;
    context: BeforePluginContext;
    isCommand: boolean;
    phases?: PluginInterceptor['phase'][];
    onDuration?: (label: string, start: number) => void;
}): Promise<InterceptorPipelineResult> {
    const phases = input.phases ?? ['security', 'conversation'];
    const interceptors = input.plugins.flatMap(plugin => collectInterceptors(plugin, input.isCommand))
        .filter(item => phases.includes(item.interceptor.phase));
    interceptors.sort((a, b) => phaseOrder(a.interceptor.phase) - phaseOrder(b.interceptor.phase)
        || b.interceptor.priority - a.interceptor.priority
        || a.pluginId.localeCompare(b.pluginId));

    for (const {pluginId, interceptor} of interceptors) {
        const start = performance.now();
        let result: InterceptorResult;
        try {
            result = await interceptor.run(input.message, input.context);
        } catch (error: unknown) {
            result = {kind: 'error', error};
        } finally {
            input.onDuration?.(`interceptor:${pluginId}`, start);
        }
        if (result.kind === 'continue') continue;
        if (result.kind === 'handled') return {handled: true};
        if (result.kind === 'reject') return {handled: true, rejectionMessage: result.message};
        logError(`Interceptor ${pluginId} falló:`, result.error);
        if (interceptor.failurePolicy === 'fail-closed') return {handled: true};
    }
    return {handled: false};
}

function collectInterceptors(plugin: Plugin, isCommand: boolean): Array<{pluginId: string; interceptor: PluginInterceptor}> {
    const pluginId = plugin.manifest?.id ?? plugin.__name ?? 'anonymous';
    const declared = (plugin.interceptors ?? []).filter(item => applies(item.appliesTo, isCommand));
    if (!plugin.before || (isCommand && !plugin.runBeforeOnCommand)) {
        return declared.map(interceptor => ({pluginId, interceptor}));
    }
    const security = /antilink|antiprivado|virustotal/i.test(pluginId);
    const legacy: PluginInterceptor = {
        phase: security ? 'security' : 'conversation',
        priority: security ? 100 : 0,
        appliesTo: isCommand ? 'commands' : 'messages',
        failurePolicy: security ? 'fail-closed' : 'fail-open',
        async run(message, context) {
            const result = await plugin.before!(message, context);
            return result === false ? {kind: 'handled'} : {kind: 'continue'};
        },
    };
    return [...declared.map(interceptor => ({pluginId, interceptor})), {pluginId, interceptor: legacy}];
}

function applies(target: PluginInterceptor['appliesTo'], isCommand: boolean): boolean {
    return target === 'all' || target === (isCommand ? 'commands' : 'messages');
}

function phaseOrder(phase: PluginInterceptor['phase']): number {
    return phase === 'security' ? 0 : phase === 'conversation' ? 1 : 2;
}
