/**
 * Filtro de keyIds de mensajes que provienen de OTROS bots conocidos.
 *
 * Importante: SOLO prefijos verificadamente exclusivos de bots externos.
 * Los patrones genéricos como `3EB0`, `BAE5`, `3E83`, `B24E` también los
 * usa WhatsApp oficial para mensajes legítimos — filtrarlos provoca que
 * ciertos participantes queden silenciosamente ignorados (no responde el
 * bot a sus comandos) sin estar baneados.
 */

const OTHER_BOT_KEY_PREFIXES = [
    'NJX-',
    'Lyru-',
    'EvoGlobalBot-',
    'FizzxyTheGreat-',
];

export function isOtherBotKey(keyId: string | undefined | null): boolean {
    if (!keyId) return false;
    if (OTHER_BOT_KEY_PREFIXES.some(p => keyId.startsWith(p))) return true;
    // 8SCO con length exactamente 20 corresponde a un bot específico
    // (esta restricción de longitud evita falsos positivos con IDs genéricos).
    if (keyId.startsWith('8SCO') && keyId.length === 20) return true;
    return false;
}
