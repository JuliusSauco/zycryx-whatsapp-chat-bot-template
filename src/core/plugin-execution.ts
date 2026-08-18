import type {ExecutionProfile, Plugin} from '../types/plugin.js';

const PROFILE_TIMEOUTS: Record<ExecutionProfile, number> = {
    fast: 15_000,
    network: 60_000,
    media: 5 * 60_000,
    'owner-operation': 2 * 60_000,
};

export class PluginTimeoutError extends Error {
    constructor(public readonly pluginId: string, public readonly timeoutMs: number) {
        super(`Plugin ${pluginId} excedió el timeout de ${timeoutMs}ms`);
        this.name = 'PluginTimeoutError';
    }
}

export function getPluginTimeoutMs(plugin: Plugin): number {
    const configured = plugin.executionPolicy?.timeoutMs;
    if (configured && configured > 0) return configured;
    return PROFILE_TIMEOUTS[plugin.executionPolicy?.profile ?? 'network'];
}

export async function executePluginWithTimeout<T>(input: {
    plugin: Plugin;
    pluginId: string;
    controller: AbortController;
    execute: () => Promise<T>;
}): Promise<T> {
    const timeoutMs = getPluginTimeoutMs(input.plugin);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            input.controller.abort(new PluginTimeoutError(input.pluginId, timeoutMs));
            reject(new PluginTimeoutError(input.pluginId, timeoutMs));
        }, timeoutMs);
        timer.unref?.();
    });
    try {
        return await Promise.race([input.execute(), timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
