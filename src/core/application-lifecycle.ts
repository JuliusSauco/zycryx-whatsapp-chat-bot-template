export type ApplicationPhase = 'starting' | 'running' | 'stopping' | 'stopped';

let phase: ApplicationPhase = 'starting';
const shutdownController = new AbortController();

export function getApplicationPhase(): ApplicationPhase {
    return phase;
}

export function getApplicationShutdownSignal(): AbortSignal {
    return shutdownController.signal;
}

export function markApplicationRunning(): void {
    if (phase === 'starting') phase = 'running';
}

export function beginApplicationShutdown(reason = 'Cierre controlado'): void {
    if (phase === 'stopping' || phase === 'stopped') return;
    phase = 'stopping';
    shutdownController.abort(new Error(reason));
}

export function markApplicationStopped(): void {
    phase = 'stopped';
}

export function isApplicationStopping(): boolean {
    return phase === 'stopping' || phase === 'stopped';
}

export function linkToApplicationShutdown(controller: AbortController): () => void {
    const signal = getApplicationShutdownSignal();
    const abort = () => controller.abort(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, {once: true});
    return () => signal.removeEventListener('abort', abort);
}
