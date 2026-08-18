import type {Guard} from '../types/guard.js';
import {SILENT_REJECT} from '../types/guard.js';
import {pickRandom} from '../utils/random.js';
import {accessModeLabel, canUseAccessMode} from '../utils/access-mode.js';
import {defaultFamilyAccess} from '../utils/family-access.js';

/** Verifica si un comando NSFW puede ejecutarse según modohorny y horario del grupo. */
export const nsfwGuard: Guard = async ({m, conn, ctx, plugin}) => {
    if (!plugin.tags?.includes('nsfw') || !ctx.isGroup) return null;

    const {nsfw_horario} = ctx.groupSettings;

    const nowBA = (await import('moment-timezone')).default().tz('America/Argentina/Buenos_Aires');
    const hhmm = nowBA.format('HH:mm');
    const [ini = '00:00', fin = '23:59'] = (nsfw_horario || '').split('-');
    const dentro = ini <= fin ? (hhmm >= ini && hhmm <= fin) : (hhmm >= ini || hhmm <= fin);

    // Los GIFs adultos de menu3 forman parte del modo NSFW general y quedan
    // disponibles para todos. El nivel configurable se aplica únicamente a la
    // familia de contenido NSFW dedicada (boobs, girls, packs, videos, etc.).
    const isExplicitContent = plugin.tags.includes('nsfw-content');
    const rule = ctx.groupSettings.familyAccess?.[isExplicitContent ? 'nsfw' : 'nsfw-gifs']
        || defaultFamilyAccess(isExplicitContent ? 'nsfw' : 'nsfw-gifs');
    const enabled = rule.enabled;
    const accessMode = rule.accessMode;
    const hasAccess = canUseAccessMode(accessMode, ctx);
    const family = isExplicitContent ? 'menú/contenido NSFW' : 'GIFs NSFW';
    const enableCommand = isExplicitContent ? '#enable nsfwmenu --owner' : '#enable nsfwgif --owner';
    if (!enabled || !hasAccess || !dentro) {
        const title = !enabled
            ? `ᴸᵒˢ ᶜᵒᵐᵃⁿᵈᵒ ˢ ʰᵒʳⁿʸ ᵉˢᵗᵃⁿ ᵈᵉˢᵃᶜᵗᶦᵛᵃᵈᵒˢ:`
            : !hasAccess
                ? `ᴱˢᵗᵉ ᶜᵒᵐᵃⁿᵈᵒ ᴺˢᶠʷ ᵗᶦᵉⁿᵉ ᵃᶜᶜᵉˢᵒ ʳᵉˢᵗʳᶦⁿᵍᶦᵈᵒ:`
                : `ᴱˢᵗᵉ ᶜᵒᵐᵃⁿᵈᵒ ˢᵒˡᵒ ᶠᵘⁿᶜᶦᵒⁿᵃ ᵉⁿ ʰᵒʳᵃʳᶦᵒ ʰᵃᵇᶦˡᶦᵗᵃᵈᵒ:`;
        const body = !enabled
            ? enableCommand
            : !hasAccess
                ? accessModeLabel(accessMode)
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
                text: enabled
                    ? hasAccess
                        ? `🔞 ${family} fuera del horario permitido (${ini} a ${fin})`
                        : `🔞 ${family} está habilitado solo para: *${accessModeLabel(accessMode)}*.`
                    : `🔞 ${family} está desactivado.\nUn owner puede usar *${enableCommand}* para activarlo.`,
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
