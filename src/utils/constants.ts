/**
 * Constantes compartidas del bot.
 * Centraliza valores hardcodeados que estaban duplicados en handler.ts y otros archivos.
 */
import {ENV} from '../core/env.js';

/** Códigos de país bloqueados para el sistema antifake. */
export const BLOCKED_COUNTRY_CODES: readonly string[] = [
    '+91', '+92', '+222', '+93', '+265', '+213', '+225', '+226',
    '+240', '+241', '+61', '+249', '+62', '+966', '+229', '+244',
    '+40', '+49', '+20', '+963', '+967', '+234', '+256', '+243',
    '+210', '+249', '+212', '+971', '+974', '+968', '+965', '+962',
    '+961', '+964', '+263', '+970',
];

/** Verifica si un número de teléfono tiene un prefijo bloqueado. */
export function isBlockedPhoneNumber(phone: string): boolean {
    return BLOCKED_COUNTRY_CODES.some(code => phone.startsWith(code.slice(1)));
}

// --- Timings ---

/** TTL para deduplicación de mensajes procesados (ms). */
export const MESSAGE_DEDUP_TTL = 60_000;

/** TTL para cache de metadata de grupos (ms). */
export const GROUP_META_CACHE_TTL = 300_000;

/** Throttle para actualización de conteo de mensajes en DB (ms). */
export const DB_THROTTLE_MS = 9_000;

// --- Fixed owners ---

const configuredFixedOwners = ENV.BOT_FIXED_OWNER_JIDS
    .split(',')
    .map(owner => owner.trim())
    .filter(Boolean);

/** Owners fijos del bot (decodificados una sola vez al inicio). */
export const FIXED_OWNERS: readonly string[] = configuredFixedOwners;
