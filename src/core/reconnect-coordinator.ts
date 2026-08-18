export interface ReconnectCoordinatorOptions {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterRatio?: number;
    random?: () => number;
    onError?: (key: string, error: unknown) => void;
}

interface ReconnectState {
    attempt: number;
    timer?: NodeJS.Timeout;
    running: boolean;
    task?: () => Promise<void>;
}

export class ReconnectCoordinator {
    private readonly states = new Map<string, ReconnectState>();
    private stopped = false;

    constructor(private readonly options: ReconnectCoordinatorOptions = {}) {}

    schedule(key: string, task: () => Promise<void>): boolean {
        if (this.stopped) return false;
        const state = this.states.get(key) ?? {attempt: 0, running: false};
        state.task = task;
        this.states.set(key, state);
        if (state.timer || state.running) return false;

        const delay = this.delayForAttempt(state.attempt++);
        state.timer = setTimeout(() => {
            state.timer = undefined;
            state.running = true;
            void task()
                .catch(error => {
                    this.options.onError?.(key, error);
                    state.running = false;
                    this.schedule(key, state.task!);
                })
                .finally(() => {
                    state.running = false;
                });
        }, delay);
        state.timer.unref?.();
        return true;
    }

    reset(key: string): void {
        const state = this.states.get(key);
        if (!state) return;
        state.attempt = 0;
        if (!state.timer && !state.running) this.states.delete(key);
    }

    cancel(key: string): void {
        const state = this.states.get(key);
        if (state?.timer) clearTimeout(state.timer);
        this.states.delete(key);
    }

    stop(): void {
        this.stopped = true;
        for (const state of this.states.values()) {
            if (state.timer) clearTimeout(state.timer);
        }
        this.states.clear();
    }

    delayForAttempt(attempt: number): number {
        const base = this.options.baseDelayMs ?? 1_000;
        const max = this.options.maxDelayMs ?? 60_000;
        const jitterRatio = this.options.jitterRatio ?? 0.2;
        const exponential = Math.min(max, base * (2 ** Math.max(0, attempt)));
        const random = (this.options.random ?? Math.random)();
        const jitter = exponential * jitterRatio * ((random * 2) - 1);
        return Math.max(0, Math.round(exponential + jitter));
    }
}
