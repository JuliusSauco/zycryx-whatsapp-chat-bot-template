import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';
import {cleanJid, isUserJid} from '../utils/jid.js';
import {getUserBanInfo, registerBanNotice} from '../services/user.service.js';

/** Verifica si el usuario está baneado. Envía aviso (máx 3) y corta. */
export const banGuard: Guard = async ({m, conn, ctx}) => {
    try {
        let rawSender = m.sender || m.key?.participant || "";
        let senderId: string;

        if (rawSender.endsWith("@lid") && m.key?.participantAlt && isUserJid(m.key.participantAlt)) {
            senderId = m.key.participantAlt;
        } else {
            senderId = rawSender;
        }

        senderId = cleanJid(senderId);

        if (senderId === ctx.botJid) return null;

        const banInfo = await getUserBanInfo(senderId);

        if (banInfo?.banned) {
            const avisos = banInfo.avisos_ban || 0;
            if (avisos < 3) {
                const nuevoAviso = avisos + 1;
                await registerBanNotice(senderId, nuevoAviso);
                const razon = banInfo.razon_ban?.trim() || "Spam";
                await conn.sendMessage(m.chat, {
                    text: `⚠️ ESTAS BANEADO ⚠️\n*• Motivo:* ${razon} (avisos: ${nuevoAviso}/3)\n*👉🏻 Puedes contactar al propietario del Bot si crees que se trata de un error o para charlar sobre tu desbaneo*\n\n👉 ${info.fb}`,
                    contextInfo: {mentionedJid: [senderId]}
                }, {quoted: m});
            }
            return SILENT_REJECT;
        }
    } catch (e: any) {
        console.error("❌ Error al verificar baneo:", e);
    }

    return null;
};
