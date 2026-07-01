import {HttpError} from '../lib/http-client.js';

export type ProviderFailureReason = 'timeout' | 'rate_limit' | 'not_found' | 'invalid_response' | 'network' | 'unsupported';

export interface ProviderFailure {
    provider: string;
    reason: ProviderFailureReason;
    error?: string;
    attempts?: number;
}

export interface ProviderResult<T> {
    data: T | null;
    failures: ProviderFailure[];
}

export interface ProviderCandidate<T> {
    name: string;
    run: () => Promise<T | null | undefined>;
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
    retryOn?: ProviderFailureReason[];
}

export interface ProviderPolicy {
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
    retryOn?: ProviderFailureReason[];
}

const FAILURE_REASON_PRIORITY: ProviderFailureReason[] = [
    'rate_limit',
    'timeout',
    'unsupported',
    'not_found',
    'network',
    'invalid_response',
];

const RETRYABLE_FAILURES: ProviderFailureReason[] = ['timeout', 'rate_limit', 'network'];
const DEFAULT_RETRY_DELAY_MS = 250;
const MAX_ERROR_DETAIL_LENGTH = 180;

export const SHORT_PROVIDER_TIMEOUT_MS = 8_000;
export const DEFAULT_PROVIDER_TIMEOUT_MS = 12_000;
export const LONG_PROVIDER_TIMEOUT_MS = 20_000;

export function withProviderPolicy<T>(
    providers: ProviderCandidate<T>[],
    policy: ProviderPolicy,
): ProviderCandidate<T>[] {
    return providers.map(provider => ({
        timeoutMs: policy.timeoutMs,
        retries: policy.retries,
        retryDelayMs: policy.retryDelayMs,
        retryOn: policy.retryOn,
        ...provider,
    }));
}

export function classifyProviderFailure(error: unknown): ProviderFailureReason {
    if (error instanceof HttpError) {
        if (error.status === 408 || error.status === 504) return 'timeout';
        if (error.status === 429) return 'rate_limit';
        if (error.status === 404 || error.status === 410) return 'not_found';
        if (error.status === 400 || error.status === 415) return 'unsupported';
        return 'network';
    }

    const message = error instanceof Error ? error.message : String(error);
    if (/abort|timeout|timed out|etimedout/i.test(message)) return 'timeout';
    if (/rate.?limit|too many requests|\b429\b/i.test(message)) return 'rate_limit';
    if (/not.?found|\b404\b|no encontrado|unavailable|private|removed|deleted/i.test(message)) return 'not_found';
    if (/unsupported|not supported|invalid url|url invalida|url inválida/i.test(message)) return 'unsupported';
    if (/invalid response|unexpected token|json|parse|no se encontr[oó]|empty response/i.test(message)) return 'invalid_response';
    return 'network';
}

export function sanitizeProviderError(error: unknown): string {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const withoutCredentials = rawMessage
        .replace(/([?&](?:api_?key|apikey|key|token|access_token|authorization|client_secret|password)=)[^&\s]+/gi, '$1[redacted]')
        .replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, '$1[redacted]');
    const withoutLongUrls = withoutCredentials.replace(/https?:\/\/[^\s)]+/gi, (url) => {
        try {
            const parsed = new URL(url);
            return `${parsed.origin}${parsed.pathname}${parsed.search ? '?[query]' : ''}`;
        } catch {
            return '[url]';
        }
    });

    return withoutLongUrls.length > MAX_ERROR_DETAIL_LENGTH
        ? `${withoutLongUrls.slice(0, MAX_ERROR_DETAIL_LENGTH - 1)}…`
        : withoutLongUrls;
}

export function summarizeProviderFailures(failures: ProviderFailure[]): ProviderFailureReason {
    for (const reason of FAILURE_REASON_PRIORITY) {
        if (failures.some(failure => failure.reason === reason)) return reason;
    }

    return 'invalid_response';
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function runWithTimeout<T>(provider: ProviderCandidate<T>): Promise<T | null | undefined> {
    if (!provider.timeoutMs || provider.timeoutMs <= 0) return provider.run();

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`provider timeout ${provider.timeoutMs}ms`)), provider.timeoutMs);
    });

    return Promise.race([provider.run(), timeout]).finally(() => {
        if (timer) clearTimeout(timer);
    });
}

function shouldRetryProvider(provider: ProviderCandidate<unknown>, reason: ProviderFailureReason, attempt: number): boolean {
    const retries = provider.retries ?? 0;
    if (attempt > retries) return false;
    const retryOn = provider.retryOn ?? RETRYABLE_FAILURES;
    return retryOn.includes(reason);
}

export async function runProviderCandidates<T>(providers: ProviderCandidate<T>[]): Promise<ProviderResult<T>> {
    const failures: ProviderFailure[] = [];

    for (const provider of providers) {
        let attempt = 0;
        try {
            let data: T | null | undefined;
            while (true) {
                attempt++;
                try {
                    data = await runWithTimeout(provider);
                    break;
                } catch (error: unknown) {
                    const reason = classifyProviderFailure(error);
                    if (!shouldRetryProvider(provider, reason, attempt)) throw error;
                    await delay(provider.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
                }
            }
            if (data) return {data, failures};
            failures.push({provider: provider.name, reason: 'invalid_response', attempts: attempt});
        } catch (error: unknown) {
            failures.push({
                provider: provider.name,
                reason: classifyProviderFailure(error),
                error: sanitizeProviderError(error),
                attempts: attempt || 1,
            });
        }
    }

    return {data: null, failures};
}
