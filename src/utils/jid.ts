/**
 * Utilidades para manipulación de JIDs de WhatsApp.
 * Centraliza operaciones que se repiten a lo largo del proyecto.
 */

/** Elimina el sufijo de puerto (`:XX`) de un JID. Ej: `5491112345678:42@s.whatsapp.net` → `5491112345678@s.whatsapp.net` */
export function cleanJid(jid: string): string {
    return jid.replace(/:\d+/, "");
}

/** Verifica si un JID corresponde a un grupo. */
export function isGroupJid(jid: string): boolean {
    return jid.endsWith("@g.us");
}

/** Extrae el número de teléfono de un JID. Ej: `5491112345678@s.whatsapp.net` → `5491112345678` */
export function jidToPhone(jid: string): string {
    return jid.split("@")[0];
}

/** Normaliza un JID: limpia puerto y asegura sufijo `@s.whatsapp.net`. */
export function normalizeJid(jid: string): string {
    if (!jid) return jid;
    if (jid.endsWith("@lid")) return jid;
    return jidToPhone(cleanJid(jid)) + "@s.whatsapp.net";
}

/** Convierte un JID a mención de WhatsApp. Ej: `5491112345678@s.whatsapp.net` → `@5491112345678` */
export function jidToTag(jid: string): string {
    return `@${jidToPhone(jid)}`;
}

/** Verifica si un JID es de tipo `@s.whatsapp.net` */
export function isUserJid(jid: string): boolean {
    return jid.endsWith("@s.whatsapp.net");
}

/** Verifica si un JID es de tipo `@lid` */
export function isLidJid(jid: string): boolean {
    return jid.endsWith("@lid");
}

/**
 * Información de identidad resuelta desde el `key` de un mensaje.
 * `sender` es el JID preferido (phone JID si se conoce, si no `@lid` crudo).
 * `lid` es el JID de privacidad (`@lid`) cuando está disponible.
 *
 * NUNCA se hace la conversión falsa de `@lid → @s.whatsapp.net` (sustituir sufijo),
 * porque el número del LID NO es el número de teléfono real y produce IDs fantasma.
 */
export interface SenderInfo {
    sender: string;
    lid: string | undefined;
}

/**
 * Resuelve identidad del autor de un mensaje de forma determinista y consistente.
 * Se usa tanto en context-builder (para `ctx.sender`/`ctx.lid`) como en upsertUser
 * (para insertar en `usuarios.id`/`usuarios.lid`). Ambos puntos DEBEN converger
 * en el mismo valor para evitar registros duplicados/fantasma.
 *
 * Prioridad:
 *   1. `participantAlt` si es phone JID (`@s.whatsapp.net`) — es el campo "verdadero".
 *   2. `remoteJidAlt` si es phone JID — fallback cuando el mensaje viene en DM con LID.
 *   3. `participant` o `remoteJid` crudo — puede ser `@lid` o `@s.whatsapp.net`.
 *
 * Si el sender resuelto termina en `@lid`, también se devuelve como `lid`.
 * `senderLid` del key se considera para enriquecer `lid` si todavía no lo tenemos.
 */
type MessageKeyLike = {
    participantAlt?: string | null;
    remoteJidAlt?: string | null;
    participant?: string | null;
    remoteJid?: string | null;
    senderLid?: string | null;
};

export function resolveSenderInfo(m: {key?: MessageKeyLike}): SenderInfo {
    const k = m.key || {};
    let sender = '';
    let lid: string | undefined;

    if (typeof k.participantAlt === 'string' && isUserJid(k.participantAlt)) {
        sender = k.participantAlt;
        if (typeof k.participant === 'string' && isLidJid(k.participant)) {
            lid = k.participant;
        }
    } else if (typeof k.remoteJidAlt === 'string' && isUserJid(k.remoteJidAlt)) {
        sender = k.remoteJidAlt;
        if (typeof k.remoteJid === 'string' && isLidJid(k.remoteJid)) {
            lid = k.remoteJid;
        }
    } else {
        const raw: string = k.participant || k.remoteJid || '';
        sender = raw;
        if (isLidJid(raw)) lid = raw;
    }

    if (!lid && typeof k.senderLid === 'string' && isLidJid(k.senderLid)) {
        lid = k.senderLid;
    }

    sender = sender ? cleanJid(sender) : '';
    lid = lid ? cleanJid(lid) : undefined;

    return {sender, lid};
}
