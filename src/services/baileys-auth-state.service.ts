import {readdir, readFile, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {hostname} from 'node:os';
import {randomUUID} from 'node:crypto';
import {
    BufferJSON,
    initAuthCreds,
    proto,
    useMultiFileAuthState,
    type AuthenticationCreds,
    type AuthenticationState,
    type SignalDataSet,
    type SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import {ENV} from '../core/env.js';
import {decryptJson, encryptJson, getConfiguredKdf} from '../lib/secret-crypto.js';
import {logError, logInfo, logWarn} from '../lib/logger.js';
import type {BaileysAuthRepository, BaileysSessionType, SignalKeyChange} from '../ports/baileys-auth.repository.js';
import {cleanJid} from '../utils/jid.js';

const SIGNAL_KEY_TYPES = [
    'app-state-sync-version',
    'app-state-sync-key',
    'sender-key-memory',
    'identity-key',
    'sender-key',
    'lid-mapping',
    'device-list',
    'pre-key',
    'session',
    'tctoken',
] as const satisfies readonly (keyof SignalDataTypeMap)[];

type SignalKeyType = keyof SignalDataTypeMap;
type StoredValue = SignalDataTypeMap[SignalKeyType];

export interface ManagedAuthState {
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    flush: () => Promise<void>;
    dispose: () => Promise<void>;
    markConnected: (botJid?: string | null) => Promise<void>;
    deleteSession: () => Promise<void>;
    leaseLost: AbortSignal;
}

/** Conflicto temporal esperado cuando dos deployments intentan relevar la misma sesión. */
export class BaileysAuthLeaseConflictError extends Error {
    constructor(sessionId: string) {
        super(`La sesión Baileys '${sessionId}' ya está activa en otra instancia.`);
        this.name = 'BaileysAuthLeaseConflictError';
    }
}

const activeStates = new Map<string, ManagedAuthState>();
let configuredRepository: BaileysAuthRepository | null = null;

export function configureBaileysAuthRepository(repository: BaileysAuthRepository): void {
    configuredRepository = repository;
}

function authRepository(): BaileysAuthRepository {
    if (!configuredRepository) throw new Error('BaileysAuthRepository no fue inyectado por el composition root.');
    return configuredRepository;
}
const openingSessions = new Set<string>();
const processLeasePrefix = `${hostname()}:${process.pid}`;

function normalizeKeyId(id: string): string {
    return id.replace(/\//g, '__').replace(/:/g, '-');
}

function recordKey(type: string, id: string): string {
    return `${type}\u0000${normalizeKeyId(id)}`;
}

function credentialsAad(sessionId: string): string {
    return `baileys:${sessionId}:credentials`;
}

function signalKeyAad(sessionId: string, type: string, id: string): string {
    return `baileys:${sessionId}:signal:${type}:${normalizeKeyId(id)}`;
}

class AuthWriteBehind {
    private readonly pending = new Map<string, {type: SignalKeyType; id: string; value: StoredValue | null}>();
    private credentialsDirty = false;
    private timer: NodeJS.Timeout | undefined;
    private running: Promise<void> | null = null;
    private retryDelayMs = 250;

    constructor(
        private readonly sessionId: string,
        private readonly getCredentials: () => AuthenticationCreds,
    ) {}

    enqueueCredentials(): void {
        this.credentialsDirty = true;
        this.schedule();
    }

    enqueueKey(type: SignalKeyType, id: string, value: StoredValue | null): void {
        this.pending.set(recordKey(type, id), {type, id: normalizeKeyId(id), value});
        this.schedule();
    }

    private schedule(delayMs = ENV.BAILEYS_AUTH_WRITE_DELAY_MS): void {
        if (this.timer || this.running) return;
        this.timer = setTimeout(() => {
            this.timer = undefined;
            void this.flush().catch(error => logError(`[AUTH] Error persistiendo sesión ${this.sessionId}:`, error));
        }, delayMs);
        this.timer.unref?.();
    }

    async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        if (this.running) {
            await this.running;
            if (this.credentialsDirty || this.pending.size) return this.flush();
            return;
        }
        if (!this.credentialsDirty && !this.pending.size) return;

        const saveCredentials = this.credentialsDirty;
        const credentialsSnapshot = saveCredentials ? this.getCredentials() : null;
        const changes = [...this.pending.entries()];
        this.credentialsDirty = false;
        this.pending.clear();

        this.running = (async () => {
            try {
                const encryptedChanges: SignalKeyChange[] = await Promise.all(changes.map(async ([, change]) => ({
                    keyType: change.type,
                    keyId: change.id,
                    payload: change.value === null
                        ? null
                        : await encryptJson(change.value, signalKeyAad(this.sessionId, change.type, change.id)),
                })));
                await Promise.all([
                    credentialsSnapshot
                        ? encryptJson(credentialsSnapshot, credentialsAad(this.sessionId))
                            .then(payload => authRepository().saveCredentials(this.sessionId, payload))
                        : Promise.resolve(),
                    authRepository().applySignalKeyChanges(this.sessionId, encryptedChanges),
                ]);
                this.retryDelayMs = 250;
            } catch (error) {
                if (saveCredentials) this.credentialsDirty = true;
                for (const [key, change] of changes) {
                    if (!this.pending.has(key)) this.pending.set(key, change);
                }
                this.retryDelayMs = Math.min(this.retryDelayMs * 2, 30_000);
                throw error;
            } finally {
                this.running = null;
                if (this.credentialsDirty || this.pending.size) this.schedule(this.retryDelayMs);
            }
        })();
        return this.running;
    }
}

async function importLegacyFolderIfNeeded(
    sessionId: string,
    botInstanceId: string,
    sessionType: BaileysSessionType,
    legacyFolder: string | undefined,
): Promise<void> {
    if (!legacyFolder || await authRepository().hasCredentials(sessionId)) return;
    const folderInfo = await stat(legacyFolder).catch(() => null);
    if (!folderInfo?.isDirectory()) return;
    const files = await readdir(legacyFolder);
    if (!files.includes('creds.json')) return;

    const credentials = JSON.parse(await readFile(path.join(legacyFolder, 'creds.json'), 'utf8'), BufferJSON.reviver) as AuthenticationCreds;
    await authRepository().ensureSession({
        sessionId,
        botInstanceId,
        type: sessionType,
        ownerId: sessionType === 'subbot' ? sessionId : null,
    });
    await authRepository().saveCredentials(sessionId, await encryptJson(credentials, credentialsAad(sessionId)));

    const changes: SignalKeyChange[] = [];
    for (const file of files) {
        if (file === 'creds.json' || !file.endsWith('.json')) continue;
        const basename = file.slice(0, -5);
        const type = SIGNAL_KEY_TYPES.find(candidate => basename.startsWith(`${candidate}-`));
        if (!type) continue;
        const id = basename.slice(type.length + 1);
        const value = JSON.parse(await readFile(path.join(legacyFolder, file), 'utf8'), BufferJSON.reviver) as StoredValue;
        changes.push({
            keyType: type,
            keyId: id,
            payload: await encryptJson(value, signalKeyAad(sessionId, type, id)),
        });
    }
    await authRepository().applySignalKeyChanges(sessionId, changes);
    logInfo(`[AUTH] Sesión ${sessionId} importada a PostgreSQL (${changes.length} Signal keys). La carpeta legacy se conservó como respaldo.`);
}

async function createDatabaseAuthState(input: {
    sessionId: string;
    botInstanceId: string;
    sessionType: BaileysSessionType;
    ownerId?: string | null;
    legacyFolder?: string;
}): Promise<ManagedAuthState> {
    const leaseOwner = `${processLeasePrefix}:${input.sessionId}:${randomUUID()}`;
    await authRepository().ensureEncryptionKeyVersion(ENV.BOT_SECRETS_KEY_VERSION, getConfiguredKdf());
    await authRepository().ensureSession({
        sessionId: input.sessionId,
        botInstanceId: input.botInstanceId,
        type: input.sessionType,
        ownerId: input.ownerId,
    });
    await importLegacyFolderIfNeeded(input.sessionId, input.botInstanceId, input.sessionType, input.legacyFolder);
    if (!await authRepository().acquireLease(input.sessionId, leaseOwner, ENV.BAILEYS_AUTH_LEASE_SECONDS)) {
        throw new BaileysAuthLeaseConflictError(input.sessionId);
    }
    let initialized = false;
    try {
        const [storedCredentials, storedKeys] = await Promise.all([
            authRepository().loadCredentials(input.sessionId),
            authRepository().listSignalKeys(input.sessionId),
        ]);
        const credentials = storedCredentials
            ? await decryptJson<AuthenticationCreds>(storedCredentials, credentialsAad(input.sessionId))
            : initAuthCreds();
        const keyCache = new Map<string, StoredValue>();
        await Promise.all(storedKeys.map(async row => {
            const value = await decryptJson<StoredValue>(row, signalKeyAad(input.sessionId, row.keyType, row.keyId));
            keyCache.set(recordKey(row.keyType, row.keyId), value);
        }));

        const writer = new AuthWriteBehind(input.sessionId, () => credentials);
        const leaseController = new AbortController();
        let leaseDeadlineTimer: NodeJS.Timeout | undefined;
        const abortLostLease = (reason: string): void => {
            if (leaseController.signal.aborted) return;
            leaseController.abort(new Error(reason));
            logError(`[AUTH] Lease perdido para ${input.sessionId}; el socket debe cerrarse.`);
        };
        const armLeaseDeadline = (): void => {
            if (leaseDeadlineTimer) clearTimeout(leaseDeadlineTimer);
            leaseDeadlineTimer = setTimeout(() => {
                abortLostLease(`El lease de la sesión '${input.sessionId}' venció sin confirmación de PostgreSQL.`);
            }, ENV.BAILEYS_AUTH_LEASE_SECONDS * 1_000);
            leaseDeadlineTimer.unref?.();
        };
        armLeaseDeadline();
        const leaseTimer = setInterval(() => {
            void authRepository().renewLease(input.sessionId, leaseOwner, ENV.BAILEYS_AUTH_LEASE_SECONDS)
                .then(renewed => {
                    if (!renewed) {
                        abortLostLease(`Se perdió el lease de la sesión '${input.sessionId}'.`);
                        return;
                    }
                    armLeaseDeadline();
                })
                .catch(error => {
                    logError(`[AUTH] No se pudo renovar lease de ${input.sessionId}:`, error);
                    // El watchdog conserva el último deadline confirmado y cerrará
                    // el socket si PostgreSQL no vuelve antes de su vencimiento.
                });
        }, Math.max(10_000, Math.floor(ENV.BAILEYS_AUTH_LEASE_SECONDS * 1_000 / 3)));
        leaseTimer.unref?.();
        const state: AuthenticationState = {
            creds: credentials,
            keys: {
            async get<T extends SignalKeyType>(type: T, ids: string[]) {
                const result: {[id: string]: SignalDataTypeMap[T]} = {};
                for (const id of ids) {
                    let value = keyCache.get(recordKey(type, id)) as SignalDataTypeMap[T] | undefined;
                    if (type === 'app-state-sync-key' && value) {
                        value = proto.Message.AppStateSyncKeyData.fromObject(value as unknown as Record<string, unknown>) as unknown as SignalDataTypeMap[T];
                    }
                    if (value !== undefined) result[id] = value;
                }
                return result;
            },
            async set(data: SignalDataSet) {
                for (const type of Object.keys(data) as SignalKeyType[]) {
                    const values = data[type];
                    if (!values) continue;
                    for (const [id, value] of Object.entries(values)) {
                        const typedValue = value as StoredValue | null;
                        const key = recordKey(type, id);
                        if (typedValue === null) keyCache.delete(key);
                        else keyCache.set(key, typedValue);
                        writer.enqueueKey(type, id, typedValue);
                    }
                }
            },
            async clear() {
                for (const key of keyCache.keys()) {
                    const [type, id] = key.split('\u0000') as [SignalKeyType, string];
                    writer.enqueueKey(type, id, null);
                }
                keyCache.clear();
            },
            },
        };

        let closePromise: Promise<void> | null = null;
        const close = (deleteSession: boolean): Promise<void> => {
            if (closePromise) return closePromise;
            closePromise = (async () => {
                clearInterval(leaseTimer);
                if (leaseDeadlineTimer) clearTimeout(leaseDeadlineTimer);
                try {
                    if (deleteSession) {
                        await authRepository().deleteSession(input.sessionId);
                        return;
                    }
                    await flushAuthWriterWithRetry(writer, input.sessionId);
                    await authRepository().releaseLease(input.sessionId, leaseOwner);
                } catch (error) {
                    await authRepository().markError(input.sessionId).catch(markError =>
                        logError(`[AUTH] No se pudo marcar ${input.sessionId} en error:`, markError));
                    await authRepository().releaseLease(input.sessionId, leaseOwner).catch(releaseError =>
                        logError(`[AUTH] No se pudo liberar lease de ${input.sessionId} tras error:`, releaseError));
                    throw error;
                } finally {
                    if (activeStates.get(input.sessionId) === managed) activeStates.delete(input.sessionId);
                }
            })();
            return closePromise;
        };
        const managed: ManagedAuthState = {
            state,
            saveCreds: async () => writer.enqueueCredentials(),
            flush: () => writer.flush(),
            dispose: () => close(false),
            markConnected: botJid => authRepository().markConnected(input.sessionId, botJid ? cleanJid(botJid) : null),
            deleteSession: () => close(true),
            leaseLost: leaseController.signal,
        };
        activeStates.set(input.sessionId, managed);
        initialized = true;
        logInfo(`[AUTH] Sesión ${input.sessionId} cargada desde PostgreSQL en memoria (${storedKeys.length} Signal keys).`);
        return managed;
    } finally {
        if (!initialized) {
            await authRepository().releaseLease(input.sessionId, leaseOwner).catch(error => {
                logError(`[AUTH] No se pudo liberar el lease tras fallar la apertura de ${input.sessionId}:`, error);
            });
        }
    }
}

async function flushAuthWriterWithRetry(writer: AuthWriteBehind, sessionId: string): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            await writer.flush();
            return;
        } catch (error) {
            lastError = error;
            logError(`[AUTH] Flush final ${attempt}/5 falló para ${sessionId}:`, error);
            if (attempt < 5) await new Promise(resolve => setTimeout(resolve, Math.min(4_000, 250 * (2 ** (attempt - 1)))));
        }
    }
    throw lastError instanceof Error ? lastError : new Error(`No se pudo persistir el auth state de ${sessionId}.`);
}

export async function useConfiguredAuthState(input: {
    sessionId: string;
    botInstanceId: string;
    sessionType: BaileysSessionType;
    ownerId?: string | null;
    legacyFolder?: string;
}): Promise<ManagedAuthState> {
    if (ENV.BAILEYS_AUTH_STATE_SOURCE === 'database') {
        if (activeStates.has(input.sessionId) || openingSessions.has(input.sessionId)) {
            throw new Error(`La sesión Baileys '${input.sessionId}' ya está abierta en este proceso.`);
        }
        openingSessions.add(input.sessionId);
        try {
            return await createDatabaseAuthState(input);
        } finally {
            openingSessions.delete(input.sessionId);
        }
    }

    if (!input.legacyFolder) throw new Error('legacyFolder es obligatorio con BAILEYS_AUTH_STATE_SOURCE=files.');
    const fileState = await useMultiFileAuthState(input.legacyFolder);
    logWarn(`[AUTH] Sesión ${input.sessionId} usa archivos locales; configura BAILEYS_AUTH_STATE_SOURCE=database para persistencia cifrada.`);
    return {
        ...fileState,
        flush: async () => undefined,
        dispose: async () => undefined,
        markConnected: async () => undefined,
        deleteSession: () => rm(input.legacyFolder!, {recursive: true, force: true}),
        leaseLost: new AbortController().signal,
    };
}

export function listStoredSubbotSessionIds(): Promise<string[]> {
    return authRepository().listActiveSessionIds('subbot');
}

export function hasStoredAuthCredentials(sessionId: string): Promise<boolean> {
    return authRepository().hasCredentials(sessionId);
}

export async function deleteStoredAuthSession(sessionId: string): Promise<void> {
    const active = activeStates.get(sessionId);
    if (active) {
        await active.deleteSession();
        return;
    }
    await authRepository().deleteSession(sessionId);
}

export async function disposeStoredAuthSession(sessionId: string): Promise<void> {
    const active = activeStates.get(sessionId);
    if (active) await active.dispose();
}

export async function flushAllDatabaseAuthStates(): Promise<void> {
    const results = await Promise.allSettled([...activeStates.values()].map(state => state.flush()));
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) throw new Error(`No se pudieron vaciar ${failures.length} sesiones Baileys a PostgreSQL.`);
}

export async function disposeAllDatabaseAuthStates(): Promise<void> {
    const results = await Promise.allSettled([...activeStates.values()].map(state => state.dispose()));
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) throw new Error(`No se pudieron cerrar ${failures.length} sesiones Baileys.`);
}

export function getAuthStateStats(): {active: number; opening: number} {
    return {active: activeStates.size, opening: openingSessions.size};
}
