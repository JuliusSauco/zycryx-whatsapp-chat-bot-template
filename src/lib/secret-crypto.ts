import {argon2, createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {BufferJSON} from '@whiskeysockets/baileys';
import {ENV} from '../core/env.js';
import {logInfo} from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export interface EncryptedPayload {
    keyVersion: number;
    ciphertext: Buffer;
    iv: Buffer;
    authTag: Buffer;
}

const keyPromises = new Map<number, Promise<Buffer>>();

function decodeKey(value: string, label: string): Buffer {
    const key = Buffer.from(value, 'base64');
    if (key.length !== KEY_BYTES) {
        throw new Error(`${label} debe contener exactamente 32 bytes codificados en base64.`);
    }
    return key;
}

function readKeyring(): Record<string, string> {
    if (!ENV.BOT_SECRETS_KEYRING_JSON) return {};
    let value: unknown;
    try {
        value = JSON.parse(ENV.BOT_SECRETS_KEYRING_JSON);
    } catch {
        throw new Error('BOT_SECRETS_KEYRING_JSON debe ser un objeto JSON válido.');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('BOT_SECRETS_KEYRING_JSON debe mapear versiones a claves base64.');
    }
    return value as Record<string, string>;
}

function deriveArgon2Key(passphrase: string, salt: Buffer): Promise<Buffer> {
    const startedAt = Date.now();
    return new Promise<Buffer>((resolve, reject) => {
        argon2('argon2id', {
            message: passphrase,
            nonce: salt,
            parallelism: 4,
            tagLength: KEY_BYTES,
            memory: 65_536,
            passes: 3,
            associatedData: 'zycryx-secrets-v1',
        }, (error, derivedKey) => {
            if (error) return reject(error);
            logInfo(`[CRYPTO] Clave maestra derivada con Argon2id en ${Date.now() - startedAt}ms (solo una vez por proceso).`);
            resolve(Buffer.from(derivedKey));
        });
    });
}

async function loadEncryptionKey(version: number): Promise<Buffer> {
    const keyring = readKeyring();
    const hasRawKey = Boolean(ENV.BOT_SECRETS_MASTER_KEY_B64 || Object.keys(keyring).length);
    if (hasRawKey && ENV.BOT_SECRETS_PASSPHRASE) {
        throw new Error('Configura claves raw/keyring o BOT_SECRETS_PASSPHRASE, no ambos métodos.');
    }
    const keyringValue = keyring[String(version)];
    if (keyringValue) return decodeKey(keyringValue, `BOT_SECRETS_KEYRING_JSON[${version}]`);

    if (version !== ENV.BOT_SECRETS_KEY_VERSION) {
        throw new Error(`No hay clave configurada para descifrar la versión ${version}.`);
    }
    if (ENV.BOT_SECRETS_MASTER_KEY_B64) {
        return decodeKey(ENV.BOT_SECRETS_MASTER_KEY_B64, 'BOT_SECRETS_MASTER_KEY_B64');
    }
    if (!ENV.BOT_SECRETS_PASSPHRASE) {
        throw new Error('Falta BOT_SECRETS_MASTER_KEY_B64 o BOT_SECRETS_PASSPHRASE para cifrar sesiones y tokens.');
    }
    if (ENV.BOT_SECRETS_PASSPHRASE.length < 16) {
        throw new Error('BOT_SECRETS_PASSPHRASE debe tener al menos 16 caracteres.');
    }
    const salt = Buffer.from(ENV.BOT_SECRETS_KDF_SALT_B64, 'base64');
    if (salt.length < 16) {
        throw new Error('BOT_SECRETS_KDF_SALT_B64 debe contener al menos 16 bytes.');
    }
    return deriveArgon2Key(ENV.BOT_SECRETS_PASSPHRASE, salt);
}

export function getEncryptionKey(version = ENV.BOT_SECRETS_KEY_VERSION): Promise<Buffer> {
    const existing = keyPromises.get(version);
    if (existing) return existing;
    const created = loadEncryptionKey(version);
    keyPromises.set(version, created);
    return created;
}

export function getConfiguredKdf(): 'raw-key' | 'argon2id' {
    return ENV.BOT_SECRETS_MASTER_KEY_B64 || Object.keys(readKeyring()).length ? 'raw-key' : 'argon2id';
}

export async function encryptBuffer(plaintext: Buffer, associatedData: string): Promise<EncryptedPayload> {
    const keyVersion = ENV.BOT_SECRETS_KEY_VERSION;
    const key = await getEncryptionKey(keyVersion);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv, {authTagLength: AUTH_TAG_BYTES});
    cipher.setAAD(Buffer.from(associatedData, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {keyVersion, ciphertext, iv, authTag: cipher.getAuthTag()};
}

export async function decryptBuffer(payload: EncryptedPayload, associatedData: string): Promise<Buffer> {
    const key = await getEncryptionKey(payload.keyVersion);
    const decipher = createDecipheriv(ALGORITHM, key, payload.iv, {authTagLength: AUTH_TAG_BYTES});
    decipher.setAAD(Buffer.from(associatedData, 'utf8'));
    decipher.setAuthTag(payload.authTag);
    return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
}

export async function encryptJson(value: unknown, associatedData: string): Promise<EncryptedPayload> {
    return encryptBuffer(Buffer.from(JSON.stringify(value, BufferJSON.replacer), 'utf8'), associatedData);
}

export async function decryptJson<T>(payload: EncryptedPayload, associatedData: string): Promise<T> {
    const plaintext = await decryptBuffer(payload, associatedData);
    return JSON.parse(plaintext.toString('utf8'), BufferJSON.reviver) as T;
}

export function clearEncryptionKeyCacheForTests(): void {
    keyPromises.clear();
}
