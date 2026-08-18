import {format} from 'node:util';

export type RuntimeConsoleLevel = 'info' | 'warn' | 'error';

export interface RuntimeConsoleEntry {
    id: number;
    timestamp: string;
    level: RuntimeConsoleLevel;
    message: string;
}

const MAX_ENTRIES = 500;
const MAX_MESSAGE_LENGTH = 12_000;
const entries: RuntimeConsoleEntry[] = [];
const ansiPattern = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
let nextId = 1;
let installed = false;

function sanitize(message: string): string {
    return message
        .replace(ansiPattern, '')
        .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[DATABASE_URL REDACTED]')
        .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/gi, '$1[REDACTED]')
        .replace(/((?:api[_-]?key|password|secret)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
        .slice(0, MAX_MESSAGE_LENGTH);
}

function capture(level: RuntimeConsoleLevel, args: unknown[]): void {
    const entry: RuntimeConsoleEntry = {
        id: nextId++,
        timestamp: new Date().toISOString(),
        level,
        message: sanitize(format(...args)),
    };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
}

export function installConsoleCapture(): void {
    if (installed) return;
    installed = true;
    const originalLog = console.log.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);

    console.log = (...args: unknown[]) => {
        capture('info', args);
        originalLog(...args);
    };
    console.warn = (...args: unknown[]) => {
        capture('warn', args);
        originalWarn(...args);
    };
    console.error = (...args: unknown[]) => {
        capture('error', args);
        originalError(...args);
    };
}

export function getRuntimeConsoleEntries(afterId = 0): RuntimeConsoleEntry[] {
    return entries.filter(entry => entry.id > afterId).map(entry => ({...entry}));
}

