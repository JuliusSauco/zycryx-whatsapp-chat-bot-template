import {execFile} from 'child_process';

export const DEFAULT_SENSITIVE_TIMEOUT_MS = 15_000;
export const DEFAULT_SENSITIVE_MAX_BUFFER = 64 * 1024;
export const DEFAULT_REPLY_MAX_CHARS = 3_500;

export interface SensitiveExecResult {
    stdout: string;
    stderr: string;
}

export interface SensitiveExecOptions {
    timeoutMs?: number;
    maxBuffer?: number;
    cwd?: string;
}

export function limitOutput(value: unknown, maxChars = DEFAULT_REPLY_MAX_CHARS): string {
    const text = typeof value === 'string' ? value : String(value ?? '');
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}\n\n...[salida truncada: ${text.length - maxChars} caracteres omitidos]`;
}

export function sanitizeCommandError(error: unknown): string {
    if (!error) return 'Error desconocido.';
    if (typeof error === 'string') return limitOutput(error);
    if (error instanceof Error) {
        const message = error.message || error.name || 'Error desconocido.';
        if (/timed out|timeout|SIGTERM|ETIMEDOUT/i.test(message)) return 'El comando excedió el tiempo máximo permitido.';
        if (/maxBuffer/i.test(message)) return 'La salida del comando excedió el tamaño máximo permitido.';
        return limitOutput(message);
    }
    return limitOutput(error);
}

export function runSensitiveFileCommand(file: string, args: string[] = [], options: SensitiveExecOptions = {}): Promise<SensitiveExecResult> {
    return new Promise((resolve, reject) => {
        execFile(file, args, {
            timeout: options.timeoutMs ?? DEFAULT_SENSITIVE_TIMEOUT_MS,
            maxBuffer: options.maxBuffer ?? DEFAULT_SENSITIVE_MAX_BUFFER,
            cwd: options.cwd,
            windowsHide: true,
        }, (error, stdout, stderr) => {
            if (error) {
                reject(Object.assign(error, {stdout, stderr}));
                return;
            }
            resolve({stdout, stderr});
        });
    });
}
