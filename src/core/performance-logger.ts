import chalk from 'chalk';
import {logDebug} from '../lib/logger.js';
import {ENV} from './env.js';

export type PerfMarks = Record<string, number>;
export type PerfDetail = {
    label: string;
    ms: number;
};

export function markPerf(marks: PerfMarks, label: string, start: number): void {
    marks[label] = Math.round(performance.now() - start);
}

export function logPerfIfSlow(marks: PerfMarks, start: number, command: string, chatId: string, details: PerfDetail[] = []): void {
    const total = Math.round(performance.now() - start);
    if (total < ENV.PERF_LOG_THRESHOLD_MS) return;
    const chunks = Object.entries(marks).map(([key, value]) => `${key}=${value}ms`).join(' ');
    const detailChunks = formatPerfDetails(details);
    logDebug(chalk.yellow(`[PERF] total=${total}ms cmd=${command || '-'} chat=${chatId} ${chunks}${detailChunks}`));
}

function formatPerfDetails(details: PerfDetail[]): string {
    if (!details.length) return '';

    const chunks = details
        .filter((detail) => detail.ms > 0)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 8)
        .map((detail) => `${detail.label}=${detail.ms}ms`);

    return chunks.length ? ` details=[${chunks.join(' ')}]` : '';
}
