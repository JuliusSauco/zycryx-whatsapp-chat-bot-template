import {logDebug, logError, logWarn} from './logger.js';
import {ENV} from '../core/env.js';
import {getApplicationShutdownSignal} from '../core/application-lifecycle.js';

type BackgroundTask = (signal: AbortSignal) => Promise<void> | void;

interface QueuedTask {
    label: string;
    task: BackgroundTask;
    key?: string;
    priority: number;
    enqueuedAt: number;
    retries: number;
    maxRetries: number;
    availableAt: number;
}

export interface BackgroundTaskOptions {
    key?: string;
    priority?: number;
    maxRetries?: number;
}

const DEFAULT_CONCURRENCY = Number.isFinite(ENV.BACKGROUND_TASK_CONCURRENCY) && ENV.BACKGROUND_TASK_CONCURRENCY > 0
    ? ENV.BACKGROUND_TASK_CONCURRENCY
    : 4;
const WARN_PENDING_THRESHOLD = 250;
const MAX_PENDING_TASKS = 1_000;
const WARN_INTERVAL_MS = 30_000;

const queue: QueuedTask[] = [];
let activeTasks = 0;
let drainScheduled: NodeJS.Timeout | undefined;
let lastWarnAt = 0;
let droppedTasks = 0;
let retriedTasks = 0;
let failedTasks = 0;
let acceptingTasks = true;

export function enqueueBackgroundTask(label: string, task: BackgroundTask, options: BackgroundTaskOptions = {}): void {
    if (!acceptingTasks) {
        droppedTasks++;
        logWarn(`⚠️ Tarea background rechazada durante cierre: ${label}`);
        return;
    }
    if (options.key) {
        const existing = queue.find(item => item.key === options.key);
        if (existing) {
            existing.task = task;
            existing.enqueuedAt = Date.now();
            return;
        }
    }
    if (queue.length >= MAX_PENDING_TASKS) {
        droppedTasks++;
        logWarn(`⚠️ Cola background llena; tarea descartada: ${label}`);
        return;
    }
    queue.push({
        label,
        task,
        key: options.key,
        priority: options.priority ?? 0,
        enqueuedAt: Date.now(),
        retries: 0,
        maxRetries: Math.max(0, options.maxRetries ?? 0),
        availableAt: Date.now(),
    });
    queue.sort((a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt);
    warnIfQueueIsGrowing();
    scheduleDrain();
}

export function getBackgroundTaskQueueStats(): {
    pending: number;
    active: number;
    concurrency: number;
    oldestPendingMs: number;
    capacity: number;
    dropped: number;
    retried: number;
    failed: number;
} {
    return {
        pending: queue.length,
        active: activeTasks,
        concurrency: DEFAULT_CONCURRENCY,
        oldestPendingMs: queue.length ? Math.max(0, Date.now() - Math.min(...queue.map(item => item.enqueuedAt))) : 0,
        capacity: MAX_PENDING_TASKS,
        dropped: droppedTasks,
        retried: retriedTasks,
        failed: failedTasks,
    };
}

export function stopBackgroundTaskIntake(): void {
    acceptingTasks = false;
}

function scheduleDrain(delayMs = 0): void {
    if (drainScheduled) return;
    drainScheduled = setTimeout(drainQueue, delayMs);
    drainScheduled.unref?.();
}

function drainQueue(): void {
    drainScheduled = undefined;

    while (activeTasks < DEFAULT_CONCURRENCY && queue.length) {
        const now = Date.now();
        const itemIndex = queue.findIndex(item => item.availableAt <= now);
        if (itemIndex < 0) {
            const nextAt = Math.min(...queue.map(item => item.availableAt));
            scheduleDrain(Math.max(1, nextAt - now));
            return;
        }
        const [item] = queue.splice(itemIndex, 1);
        if (!item) continue;

        activeTasks++;
        let succeeded = false;
        Promise.resolve()
            .then(() => item.task(getApplicationShutdownSignal()))
            .then(() => { succeeded = true; })
            .catch((err: unknown) => {
                if (item.retries < item.maxRetries) {
                    item.retries++;
                    item.enqueuedAt = Date.now();
                    item.availableAt = Date.now() + Math.min(30_000, 250 * (2 ** (item.retries - 1))) + Math.floor(Math.random() * 100);
                    queue.push(item);
                    queue.sort((a, b) => b.priority - a.priority || a.availableAt - b.availableAt);
                    retriedTasks++;
                    return;
                }
                failedTasks++;
                logError(`Error en tarea background "${item.label}":`, err);
            })
            .finally(() => {
                activeTasks--;
                if (succeeded) logDebug(`Background task completada: ${item.label}`);
                if (queue.length) scheduleDrain();
            });
    }
}

export async function drainBackgroundTasks(timeoutMs = 10_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while ((queue.length || activeTasks) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    return queue.length === 0 && activeTasks === 0;
}

function warnIfQueueIsGrowing(): void {
    if (queue.length < WARN_PENDING_THRESHOLD) return;

    const now = Date.now();
    if (now - lastWarnAt < WARN_INTERVAL_MS) return;

    lastWarnAt = now;
    logWarn(`⚠️ Cola background acumulada: ${queue.length} tareas pendientes.`);
}
