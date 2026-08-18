import type {Notification, PoolClient} from 'pg';
import {db} from './postgres.js';
import {
    invalidateAllDatabaseCaches,
    invalidateGroupCensoredUsers,
    invalidateGroupSettings,
    invalidateSubbotConfig,
} from './db-cache.js';
import {invalidateApiTokenCache} from '../services/api-token.service.js';
import {logError, logInfo} from './logger.js';

interface CacheInvalidationMessage {
    domain: 'bot-instance' | 'group-settings' | 'group-censored-users' | 'api-token';
    key: string | null;
}

export interface CacheInvalidationListenerStatus {
    connected: boolean;
    reconnectAttempts: number;
    lastNotificationAt: number | null;
}

let client: PoolClient | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let connectPromise: Promise<void> | null = null;
let stopping = false;
let reconnectAttempts = 0;
let lastNotificationAt: number | null = null;

export function getCacheInvalidationListenerStatus(): CacheInvalidationListenerStatus {
    return {connected: Boolean(client), reconnectAttempts, lastNotificationAt};
}

export function startCacheInvalidationListener(): Promise<void> {
    if (client) return Promise.resolve();
    if (connectPromise) return connectPromise;
    stopping = false;
    connectPromise = connectListener().finally(() => { connectPromise = null; });
    return connectPromise;
}

async function connectListener(): Promise<void> {
    const connected = await db.connect();
    if (stopping) {
        connected.release();
        return;
    }
    try {
        await connected.query('LISTEN zycryx_cache_invalidate');
    } catch (error) {
        connected.release(true);
        throw error;
    }
    client = connected;
    reconnectAttempts = 0;
    connected.on('notification', handleNotification);
    connected.on('error', error => handleConnectionError(connected, error));
    logInfo('[CACHE] Invalidación distribuida LISTEN/NOTIFY activa.');
}

function handleNotification(notification: Notification): void {
    lastNotificationAt = Date.now();
    try {
        const message = JSON.parse(notification.payload || '') as CacheInvalidationMessage;
        invalidateMessage(message);
    } catch (error) {
        logError('[CACHE] Payload de invalidación inválido; se limpian todos los caches:', error);
        invalidateAllDatabaseCaches();
        invalidateApiTokenCache();
    }
}

function invalidateMessage(message: CacheInvalidationMessage): void {
    if (!message.key) {
        invalidateAllDatabaseCaches();
        invalidateApiTokenCache();
        return;
    }
    switch (message.domain) {
        case 'bot-instance': invalidateSubbotConfig(message.key); break;
        case 'group-settings': invalidateGroupSettings(message.key); break;
        case 'group-censored-users': invalidateGroupCensoredUsers(message.key); break;
        case 'api-token': invalidateApiTokenCache(message.key); break;
        default: invalidateAllDatabaseCaches();
    }
}

function handleConnectionError(connected: PoolClient, error: Error): void {
    if (client !== connected) return;
    logError('[CACHE] Listener de invalidación perdió conexión:', error);
    client = null;
    connected.release(true);
    scheduleReconnect();
}

function scheduleReconnect(): void {
    if (stopping || reconnectTimer) return;
    const attempt = reconnectAttempts++;
    const delay = Math.min(60_000, 1_000 * (2 ** Math.min(attempt, 6))) + Math.floor(Math.random() * 500);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void startCacheInvalidationListener().catch(error => {
            logError('[CACHE] No se pudo reconectar listener:', error);
            scheduleReconnect();
        });
    }, delay);
    reconnectTimer.unref?.();
}

export async function stopCacheInvalidationListener(): Promise<void> {
    stopping = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    const active = client;
    client = null;
    if (!active) return;
    active.removeListener('notification', handleNotification);
    await active.query('UNLISTEN zycryx_cache_invalidate').catch(() => undefined);
    active.release();
}
