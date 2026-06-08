import {logDebug, logError, logWarn} from './logger.js';
import {ENV} from '../core/env.js';

type BackgroundTask = () => Promise<void> | void;

interface QueuedTask {
    label: string;
    task: BackgroundTask;
}

const DEFAULT_CONCURRENCY = Number.isFinite(ENV.BACKGROUND_TASK_CONCURRENCY) && ENV.BACKGROUND_TASK_CONCURRENCY > 0
    ? ENV.BACKGROUND_TASK_CONCURRENCY
    : 4;
const WARN_PENDING_THRESHOLD = 250;
const WARN_INTERVAL_MS = 30_000;

const queue: QueuedTask[] = [];
let activeTasks = 0;
let drainScheduled = false;
let lastWarnAt = 0;

export function enqueueBackgroundTask(label: string, task: BackgroundTask): void {
    queue.push({label, task});
    warnIfQueueIsGrowing();
    scheduleDrain();
}

export function getBackgroundTaskQueueStats(): {
    pending: number;
    active: number;
    concurrency: number;
} {
    return {
        pending: queue.length,
        active: activeTasks,
        concurrency: DEFAULT_CONCURRENCY,
    };
}

function scheduleDrain(): void {
    if (drainScheduled) return;
    drainScheduled = true;
    setTimeout(drainQueue, 0);
}

function drainQueue(): void {
    drainScheduled = false;

    while (activeTasks < DEFAULT_CONCURRENCY && queue.length) {
        const item = queue.shift();
        if (!item) return;

        activeTasks++;
        Promise.resolve()
            .then(item.task)
            .catch((err: unknown) => logError(`Error en tarea background "${item.label}":`, err))
            .finally(() => {
                activeTasks--;
                logDebug(`Background task completada: ${item.label}`);
                if (queue.length) scheduleDrain();
            });
    }
}

function warnIfQueueIsGrowing(): void {
    if (queue.length < WARN_PENDING_THRESHOLD) return;

    const now = Date.now();
    if (now - lastWarnAt < WARN_INTERVAL_MS) return;

    lastWarnAt = now;
    logWarn(`⚠️ Cola background acumulada: ${queue.length} tareas pendientes.`);
}
