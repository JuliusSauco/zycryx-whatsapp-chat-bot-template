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
import {baileysAuthRepository} from '../adapters/drizzle/baileys-auth.repository.js';
import {decryptJson, encryptJson, getConfiguredKdf} from '../lib/secret-crypto.js';
import {logError, logInfo, logWarn} from '../lib/logger.js';
import type {BaileysSessionType, SignalKeyChange} from '../ports/baileys-auth.repository.js';

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

const activeStates = new Set<ManagedAuthState>();
const leaseOwner = `${hostname()}:${process.pid}:${randomUUID()}`;

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
                            .then(payload => baileysAuthRepository.saveCredentials(this.sessionId, payload))
                        : Promise.resolve(),
                    baileysAuthRepository.applySignalKeyChanges(this.sessionId, encryptedChanges),
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
    sessionType: BaileysSessionType,
    legacyFolder: string | undefined,
): Promise<void> {
    if (!legacyFolder || await baileysAuthRepository.hasCredentials(sessionId)) return;
    const folderInfo = await stat(legacyFolder).catch(() => null);
    if (!folderInfo?.isDirectory()) return;
    const files = await readdir(legacyFolder);
    if (!files.includes('creds.json')) return;

    const credentials = JSON.parse(await readFile(path.join(legacyFolder, 'creds.json'), 'utf8'), BufferJSON.reviver) as AuthenticationCreds;
    await baileysAuthRepository.ensureSession({id: sessionId, type: sessionType, ownerId: sessionType === 'subbot' ? sessionId : null});
    await baileysAuthRepository.saveCredentials(sessionId, await encryptJson(credentials, credentialsAad(sessionId)));

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
    await baileysAuthRepository.applySignalKeyChanges(sessionId, changes);
    logInfo(`[AUTH] Sesión ${sessionId} importada a PostgreSQL (${changes.length} Signal keys). La carpeta legacy se conservó como respaldo.`);
}

async function createDatabaseAuthState(input: {
    sessionId: string;
    sessionType: BaileysSessionType;
    ownerId?: string | null;
    legacyFolder?: string;
}): Promise<ManagedAuthState> {
    await baileysAuthRepository.ensureEncryptionKeyVersion(ENV.BOT_SECRETS_KEY_VERSION, getConfiguredKdf());
    await baileysAuthRepository.ensureSession({id: input.sessionId, type: input.sessionType, ownerId: input.ownerId});
    await importLegacyFolderIfNeeded(input.sessionId, input.sessionType, input.legacyFolder);
    if (!await baileysAuthRepository.acquireLease(input.sessionId, leaseOwner, ENV.BAILEYS_AUTH_LEASE_SECONDS)) {
        throw new Error(`La sesión Baileys '${input.sessionId}' ya está activa en otra instancia.`);
    }

    const [storedCredentials, storedKeys] = await Promise.all([
        baileysAuthRepository.loadCredentials(input.sessionId),
        baileysAuthRepository.listSignalKeys(input.sessionId),
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
    const leaseTimer = setInterval(() => {
        void baileysAuthRepository.renewLease(input.sessionId, leaseOwner, ENV.BAILEYS_AUTH_LEASE_SECONDS)
            .then(renewed => {
                if (!renewed && !leaseController.signal.aborted) {
                    leaseController.abort(new Error(`Se perdió el lease de la sesión '${input.sessionId}'.`));
                    logError(`[AUTH] Lease perdido para ${input.sessionId}; el socket debe cerrarse.`);
                }
            })
            .catch(error => logError(`[AUTH] No se pudo renovar lease de ${input.sessionId}:`, error));
    }, Math.max(10_000, Math.floor(ENV.BAILEYS_AUTH_LEASE_SECONDS * 1000 / 3)));
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

    const managed: ManagedAuthState = {
        state,
        saveCreds: async () => writer.enqueueCredentials(),
        flush: () => writer.flush(),
        async dispose() {
            clearInterval(leaseTimer);
            await writer.flush();
            await baileysAuthRepository.releaseLease(input.sessionId, leaseOwner);
            activeStates.delete(managed);
        },
        markConnected: botJid => baileysAuthRepository.markConnected(input.sessionId, botJid ?? null),
        async deleteSession() {
            clearInterval(leaseTimer);
            await writer.flush();
            await baileysAuthRepository.deleteSession(input.sessionId);
            activeStates.delete(managed);
        },
        leaseLost: leaseController.signal,
    };
    activeStates.add(managed);
    logInfo(`[AUTH] Sesión ${input.sessionId} cargada desde PostgreSQL en memoria (${storedKeys.length} Signal keys).`);
    return managed;
}

export async function useConfiguredAuthState(input: {
    sessionId: string;
    sessionType: BaileysSessionType;
    ownerId?: string | null;
    legacyFolder?: string;
}): Promise<ManagedAuthState> {
    if (ENV.BAILEYS_AUTH_STATE_SOURCE === 'database') return createDatabaseAuthState(input);

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
    return baileysAuthRepository.listActiveSessionIds('subbot');
}

export function hasStoredAuthCredentials(sessionId: string): Promise<boolean> {
    return baileysAuthRepository.hasCredentials(sessionId);
}

export async function deleteStoredAuthSession(sessionId: string): Promise<void> {
    await baileysAuthRepository.deleteSession(sessionId);
}

export async function flushAllDatabaseAuthStates(): Promise<void> {
    const results = await Promise.allSettled([...activeStates].map(state => state.flush()));
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) throw new Error(`No se pudieron vaciar ${failures.length} sesiones Baileys a PostgreSQL.`);
}
