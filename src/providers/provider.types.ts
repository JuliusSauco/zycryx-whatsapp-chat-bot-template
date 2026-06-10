export type ProviderFailureReason = 'empty' | 'error';

export interface ProviderFailure {
    provider: string;
    reason: ProviderFailureReason;
    error?: string;
}

export interface ProviderResult<T> {
    data: T | null;
    failures: ProviderFailure[];
}

export interface ProviderCandidate<T> {
    name: string;
    run: () => Promise<T | null | undefined>;
}

export async function runProviderCandidates<T>(providers: ProviderCandidate<T>[]): Promise<ProviderResult<T>> {
    const failures: ProviderFailure[] = [];

    for (const provider of providers) {
        try {
            const data = await provider.run();
            if (data) return {data, failures};
            failures.push({provider: provider.name, reason: 'empty'});
        } catch (error: unknown) {
            failures.push({
                provider: provider.name,
                reason: 'error',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return {data: null, failures};
}
