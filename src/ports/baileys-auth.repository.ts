import type {EncryptedPayload} from '../lib/secret-crypto.js';

export type BaileysSessionType = 'main' | 'subbot';

export interface StoredSignalKey extends EncryptedPayload {
    keyType: string;
    keyId: string;
}

export interface SignalKeyChange {
    keyType: string;
    keyId: string;
    payload: EncryptedPayload | null;
}

export interface BaileysAuthRepository {
    ensureEncryptionKeyVersion(version: number, kdf: 'raw-key' | 'argon2id'): Promise<void>;
    ensureSession(input: {sessionId: string; botInstanceId: string; type: BaileysSessionType; ownerId?: string | null}): Promise<void>;
    acquireLease(sessionId: string, leaseOwner: string, leaseSeconds: number): Promise<boolean>;
    renewLease(sessionId: string, leaseOwner: string, leaseSeconds: number): Promise<boolean>;
    releaseLease(sessionId: string, leaseOwner: string): Promise<void>;
    hasCredentials(sessionId: string): Promise<boolean>;
    hasConnectedIdentity(sessionId: string): Promise<boolean>;
    loadCredentials(sessionId: string): Promise<EncryptedPayload | null>;
    listSignalKeys(sessionId: string): Promise<StoredSignalKey[]>;
    saveCredentials(sessionId: string, payload: EncryptedPayload): Promise<void>;
    applySignalKeyChanges(sessionId: string, changes: SignalKeyChange[]): Promise<void>;
    listActiveSessionIds(type: BaileysSessionType): Promise<string[]>;
    markConnected(sessionId: string, botJid: string | null): Promise<void>;
    markError(sessionId: string): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
}
