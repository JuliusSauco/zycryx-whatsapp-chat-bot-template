import {randomUUID} from 'node:crypto';
import {createClient, type RedisClientType} from 'redis';
import {ENV} from '../core/env.js';
import {logError, logInfo, logWarn} from './logger.js';

type RedisClient = RedisClientType;

export interface RedisRuntimeStatus {
    configured: boolean;
    required: boolean;
    connected: boolean;
    ready: boolean;
    hits: number;
    misses: number;
    writes: number;
    deletes: number;
    errors: number;
    lastErrorAt: number | null;
}

export type RedisReadResult<T> =
    | {available: false; value: null}
    | {available: true; value: T | null};

export type RedisAcquireResult =
    | {available: false; acquired: false; token: null}
    | {available: true; acquired: false; token: null}
    | {available: true; acquired: true; token: string};

let client: RedisClient | null = null;
let startPromise: Promise<void> | null = null;
let stopping = false;
const counters = {hits: 0, misses: 0, writes: 0, deletes: 0, errors: 0};
let lastErrorAt: number | null = null;
let lastLoggedErrorAt = 0;

function redisKey(namespace: string, key: string): string {
    return `${ENV.REDIS_KEY_PREFIX}:${namespace}:${encodeURIComponent(key)}`;
}

function activeClient(): RedisClient | null {
    return client?.isReady ? client : null;
}

function recordError(context: string, error: unknown): void {
    counters.errors++;
    lastErrorAt = Date.now();
    if (Date.now() - lastLoggedErrorAt >= 30_000) {
        lastLoggedErrorAt = Date.now();
        logError(`[REDIS] ${context}:`, error);
    }
}

export function getRedisRuntimeStatus(): RedisRuntimeStatus {
    return {
        configured: Boolean(ENV.REDIS_URL),
        required: ENV.REDIS_REQUIRED,
        connected: Boolean(client?.isOpen),
        ready: Boolean(client?.isReady),
        ...counters,
        lastErrorAt,
    };
}

export function startRedisRuntime(): Promise<void> {
    if (!ENV.REDIS_URL) {
        if (ENV.REDIS_REQUIRED) return Promise.reject(new Error('REDIS_REQUIRED=true pero REDIS_URL no está configurada.'));
        logInfo('[REDIS] Sin REDIS_URL; se mantienen los caches locales como fallback.');
        return Promise.resolve();
    }
    if (client?.isReady) return Promise.resolve();
    if (startPromise) return startPromise;
    stopping = false;
    startPromise = connectRedis().finally(() => { startPromise = null; });
    return startPromise;
}

async function connectRedis(): Promise<void> {
    const nextClient = createClient({
        url: ENV.REDIS_URL,
        socket: {
            connectTimeout: ENV.REDIS_CONNECT_TIMEOUT_MS,
            reconnectStrategy: retries => Math.min(5_000, 100 * (2 ** Math.min(retries, 6))),
        },
    });
    nextClient.on('error', error => recordError('Error de conexión', error));
    nextClient.on('reconnecting', () => logWarn('[REDIS] Reconectando con el servicio compartido.'));
    client = nextClient;
    try {
        let timeout: NodeJS.Timeout | undefined;
        await Promise.race([
            nextClient.connect(),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error('Timeout iniciando la conexión Redis.')), ENV.REDIS_CONNECT_TIMEOUT_MS * 3);
                timeout.unref?.();
            }),
        ]).finally(() => { if (timeout) clearTimeout(timeout); });
        if (stopping) {
            await nextClient.close();
            return;
        }
        logInfo('[REDIS] Cache y coordinación distribuida activos.');
    } catch (error) {
        if (client === nextClient) client = null;
        nextClient.destroy();
        recordError('No se pudo iniciar', error);
        if (ENV.REDIS_REQUIRED) throw error;
        logWarn('[REDIS] Se continuará con cache local porque Redis es opcional.');
    }
}

export async function stopRedisRuntime(): Promise<void> {
    stopping = true;
    const active = client;
    client = null;
    if (!active) return;
    if (active.isOpen) await active.close().catch(error => recordError('Error cerrando cliente', error));
}

export async function getRedisJson<T>(namespace: string, key: string): Promise<RedisReadResult<T>> {
    const active = activeClient();
    if (!active) return {available: false, value: null};
    try {
        const raw = await active.get(redisKey(namespace, key));
        if (raw === null) {
            counters.misses++;
            return {available: true, value: null};
        }
        counters.hits++;
        return {available: true, value: JSON.parse(raw) as T};
    } catch (error) {
        recordError(`Lectura fallida (${namespace})`, error);
        return {available: false, value: null};
    }
}

export async function setRedisJson(namespace: string, key: string, value: unknown, ttlSeconds = ENV.REDIS_CACHE_TTL_SECONDS): Promise<void> {
    const active = activeClient();
    if (!active) return;
    try {
        await active.set(redisKey(namespace, key), JSON.stringify(value), {EX: Math.max(1, ttlSeconds)});
        counters.writes++;
    } catch (error) {
        recordError(`Escritura fallida (${namespace})`, error);
    }
}

export async function deleteRedisKeys(entries: Array<{namespace: string; key: string}>): Promise<void> {
    const active = activeClient();
    if (!active || entries.length === 0) return;
    try {
        const keys = entries.map(entry => redisKey(entry.namespace, entry.key));
        counters.deletes += await active.unlink(keys);
    } catch (error) {
        recordError('Invalidación fallida', error);
    }
}

export async function clearRedisNamespace(namespace: string): Promise<void> {
    const active = activeClient();
    if (!active) return;
    try {
        for await (const keys of active.scanIterator({MATCH: `${ENV.REDIS_KEY_PREFIX}:${namespace}:*`, COUNT: 200})) {
            if (keys.length > 0) counters.deletes += await active.unlink(keys);
        }
    } catch (error) {
        recordError(`Limpieza fallida (${namespace})`, error);
    }
}

export async function acquireRedisLock(namespace: string, key: string, ttlMs: number): Promise<RedisAcquireResult> {
    const active = activeClient();
    if (!active) return {available: false, acquired: false, token: null};
    const token = randomUUID();
    try {
        const result = await active.set(redisKey(namespace, key), token, {NX: true, PX: Math.max(1_000, ttlMs)});
        if (result !== 'OK') return {available: true, acquired: false, token: null};
        counters.writes++;
        return {available: true, acquired: true, token};
    } catch (error) {
        recordError(`Lock fallido (${namespace})`, error);
        return {available: false, acquired: false, token: null};
    }
}

export async function releaseRedisLock(namespace: string, key: string, token: string): Promise<void> {
    const active = activeClient();
    if (!active) return;
    try {
        const deleted = await active.eval(
            "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
            {keys: [redisKey(namespace, key)], arguments: [token]},
        );
        if (typeof deleted === 'number') counters.deletes += deleted;
    } catch (error) {
        recordError(`Liberación de lock fallida (${namespace})`, error);
    }
}
