import {logError} from './logger.js';
import {runProviderCandidates, type ProviderResult} from '../providers/provider.types.js';

export interface Provider<T> {
    name: string;
    run: () => Promise<T | null | undefined>;
}

export function runFirstProviderResult<T>(providers: Provider<T>[]): Promise<ProviderResult<T>> {
    return runProviderCandidates(providers);
}

export async function runFirstProvider<T>(providers: Provider<T>[], errorMessage: string): Promise<T> {
    const result = await runFirstProviderResult(providers);
    if (result.data) return result.data;

    for (const failure of result.failures) {
        logError(`[PROVIDER ${failure.provider}] ${failure.reason}${failure.error ? `: ${failure.error}` : ''}`);
    }

    throw new Error(errorMessage);
}
