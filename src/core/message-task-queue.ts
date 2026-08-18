export interface MessageTaskQueueOptions {
    concurrency: number;
    perKeyLimit: number;
    globalLimit: number;
    onError?: (error: unknown) => void;
}

export interface MessageTaskQueueStats {
    pending: number;
    activeKeys: number;
    queuedKeys: number;
    rejected: number;
}

type Task = () => Promise<void>;

export class MessageTaskQueue {
    private readonly queues = new Map<string, Task[]>();
    private readonly readyKeys: string[] = [];
    private readonly readySet = new Set<string>();
    private readonly activeKeys = new Set<string>();
    private pending = 0;
    private rejected = 0;

    constructor(private readonly options: MessageTaskQueueOptions) {}

    enqueue(key: string, task: Task): boolean {
        const queue = this.queues.get(key) ?? [];
        if (this.pending >= this.options.globalLimit || queue.length >= this.options.perKeyLimit) {
            this.rejected++;
            return false;
        }
        queue.push(task);
        this.pending++;
        this.queues.set(key, queue);
        this.markReady(key);
        this.drain();
        return true;
    }

    getStats(): MessageTaskQueueStats {
        return {
            pending: this.pending,
            activeKeys: this.activeKeys.size,
            queuedKeys: this.queues.size,
            rejected: this.rejected,
        };
    }

    async idle(timeoutMs = 10_000): Promise<boolean> {
        const deadline = Date.now() + timeoutMs;
        while ((this.pending || this.activeKeys.size) && Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return this.pending === 0 && this.activeKeys.size === 0;
    }

    private markReady(key: string): void {
        if (this.activeKeys.has(key) || this.readySet.has(key)) return;
        this.readySet.add(key);
        this.readyKeys.push(key);
    }

    private drain(): void {
        while (this.activeKeys.size < this.options.concurrency && this.readyKeys.length) {
            const key = this.readyKeys.shift();
            if (!key) return;
            this.readySet.delete(key);
            const queue = this.queues.get(key);
            const task = queue?.shift();
            if (!task) {
                this.queues.delete(key);
                continue;
            }
            this.pending--;
            this.activeKeys.add(key);
            void task()
                .catch(error => this.options.onError?.(error))
                .finally(() => {
                    this.activeKeys.delete(key);
                    const remaining = this.queues.get(key);
                    if (remaining?.length) this.markReady(key);
                    else this.queues.delete(key);
                    this.drain();
                });
        }
    }
}
