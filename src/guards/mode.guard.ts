import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';

/** Si el bot está en modo privado, solo el creator y el propio bot pueden usar comandos. */
export const modeGuard: Guard = async ({ctx}) => {
    const modo = ctx.botConfig.mode || "public";
    if (modo === "private" && !ctx.isCreator && ctx.senderJid !== ctx.botJid) {
        return SILENT_REJECT;
    }
    return null;
};
