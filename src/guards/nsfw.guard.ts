import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';
import {getNsfwSettings} from '../services/group-settings.service.js';
import {pickRandom} from '../utils/random.js';
import {accessModeLabel, canUseAccessMode} from '../utils/access-mode.js';

/** Verifica si un comando NSFW puede ejecutarse según modohorny y horario del grupo. */
export const nsfwGuard: Guard = async ({m, conn, ctx, plugin}) => {
    if (!plugin.tags?.includes('nsfw') || !ctx.isGroup) return null;

    const {modohorny = false, nsfwAccessMode = 'all', nsfw_horario} = await getNsfwSettings(ctx.chatId);

    const nowBA = (await import('moment-timezone')).default().tz('America/Argentina/Buenos_Aires');
    const hhmm = nowBA.format('HH:mm');
    const [ini = '00:00', fin = '23:59'] = (nsfw_horario || '').split('-');
    const dentro = ini <= fin ? (hhmm >= ini && hhmm <= fin) : (hhmm >= ini || hhmm <= fin);

    // Los GIFs adultos de menu3 forman parte del modo NSFW general y quedan
    // disponibles para todos. El nivel configurable se aplica únicamente a la
    // familia de contenido NSFW dedicada (boobs, girls, packs, videos, etc.).
    const hasAccess = plugin.feature === 'nsfw' || canUseAccessMode(nsfwAccessMode, ctx);
    if (!modohorny || !hasAccess || !dentro) {
        const title = !modohorny
            ? `ᴸᵒˢ ᶜᵒᵐᵃⁿᵈᵒ ˢ ʰᵒʳⁿʸ ᵉˢᵗᵃⁿ ᵈᵉˢᵃᶜᵗᶦᵛᵃᵈᵒˢ:`
            : !hasAccess
                ? `ᴱˢᵗᵉ ᶜᵒᵐᵃⁿᵈᵒ ᴺˢᶠʷ ᵗᶦᵉⁿᵉ ᵃᶜᶜᵉˢᵒ ʳᵉˢᵗʳᶦⁿᵍᶦᵈᵒ:`
                : `ᴱˢᵗᵉ ᶜᵒᵐᵃⁿᵈᵒ ˢᵒˡᵒ ᶠᵘⁿᶜᶦᵒⁿᵃ ᵉⁿ ʰᵒʳᵃʳᶦᵒ ʰᵃᵇᶦˡᶦᵗᵃᵈᵒ:`;
        const body = !modohorny
            ? '#enable nsfw --owner'
            : !hasAccess
                ? accessModeLabel(nsfwAccessMode)
                : `${ini} a ${fin}`;
        const stickerUrls = ['https://qu.ax/bXMB.webp', 'https://qu.ax/TxtQ.webp'];
        try {
            await conn.sendFile(ctx.chatId, pickRandom(stickerUrls), 'desactivado.webp', '', m, true, {
                contextInfo: {
                    forwardingScore: 200,
                    isForwarded: false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title,
                        body,
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
                    ? hasAccess
                        ? `🔞 NSFW fuera del horario permitido (${ini} a ${fin})`
                        : `🔞 NSFW está habilitado solo para: *${accessModeLabel(nsfwAccessMode)}*.`
                    : '🔞 El NSFW está desactivado.\nUn owner puede usar *#enable nsfw --owner* para activarlo.',
                contextInfo: {
                    externalAdReply: {
                        title: 'NSFW Desactivado',
                        body,
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
