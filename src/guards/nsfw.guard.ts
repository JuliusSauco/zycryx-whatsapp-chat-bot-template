import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';
import {getNsfwSettings} from '../services/group-settings.service.js';
import {pickRandom} from '../utils/random.js';

/** Verifica si un comando NSFW puede ejecutarse según modohorny y horario del grupo. */
export const nsfwGuard: Guard = async ({m, conn, ctx, plugin}) => {
    if (!plugin.tags?.includes('nsfw') || !ctx.isGroup) return null;

    const {modohorny = false, nsfw_horario} = await getNsfwSettings(ctx.chatId);

    const nowBA = (await import('moment-timezone')).default().tz('America/Argentina/Buenos_Aires');
    const hhmm = nowBA.format('HH:mm');
    const [ini = '00:00', fin = '23:59'] = (nsfw_horario || '').split('-');
    const dentro = ini <= fin ? (hhmm >= ini && hhmm <= fin) : (hhmm >= ini || hhmm <= fin);

    if (!modohorny || !dentro) {
        const stickerUrls = ['https://qu.ax/bXMB.webp', 'https://qu.ax/TxtQ.webp'];
        try {
            await conn.sendFile(ctx.chatId, pickRandom(stickerUrls), 'desactivado.webp', '', m, true, {
                contextInfo: {
                    forwardingScore: 200,
                    isForwarded: false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title: modohorny
                            ? `ᴱˢᵗᵉ ᶜᵒᵐᵃⁿᵈᵒ ˢᵒˡᵒ ᶠᵘⁿᶜᶦᵒⁿᵃ ᵉⁿ ʰᵒʳᵃʳᶦᵒ ʰᵃᵇᶦˡᶦᵗᵃᵈᵒ:`
                            : `ᴸᵒˢ ᶜᵒᵐᵃⁿᵈᵒ ˢ ʰᵒʳⁿʸ ᵉˢᵗᵃⁿ ᵈᵉˢᵃᶜᵗᶦᵛᵃᵈᵒˢ:`,
                        body: modohorny ? `${ini} a ${fin}` : '#enable modohorny',
                        mediaType: 2,
                        sourceUrl: info.md,
                        thumbnail: m.pp
                    }
                },
                ephemeralExpiration: 24 * 60 * 100,
                disappearingMessagesInChat: 24 * 60 * 100
            });
        } catch {
            await conn.sendMessage(ctx.chatId, {
                text: modohorny
                    ? `🔞 NSFW fuera del horario permitido (${ini} a ${fin})`
                    : '🔞 El NSFW está desactivado por un admin.\nUsa *#enable modohorny* para activarlo.',
                contextInfo: {
                    externalAdReply: {
                        title: 'NSFW Desactivado',
                        body: modohorny ? `Horario permitido: ${ini} a ${fin}` : '#enable modohorny',
                        mediaType: 2,
                        thumbnail: m.pp,
                        sourceUrl: info.md
                    }
                }
            }, {quoted: m});
        }

        return SILENT_REJECT;
    }

    return null;
};
