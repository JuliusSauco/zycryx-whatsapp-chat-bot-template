import {logInfo} from '../../lib/logger.js';
// Código adaptado por https://github.com/GataNina-Li
// Código compatible con canales y comunidades de WhatsApp

import {definePlugin} from '../../core/define-plugin.js';
import {
    buildInviteGroupCaption,
    buildNewsletterCaption,
    getNewsletterPreviewUrl,
    type GroupInfoLike,
    type NewsletterObject,
} from './herramientas-superinspect.helpers.js';


export default definePlugin({
    help: ["superinspect", "inspect"],
    tags: ['tools'],
    command: /^(superinspect|inspect|revisar|inspeccionar)$/i,
    register: true,
    async execute(m, {conn, args, text}) {
    const channelUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
    const thumb = m.pp

    let inviteCode: string | null = null
    if (!text) return await m.reply(`*⚠️ Ingrese un enlace de un grupo/comunidad/canal de WhatsApp para obtener información.*`)
    const inviteUrl = text.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]

    let groupInfo: string | null = null
    if (inviteUrl) {
        try {
            const inviteInfo = await conn.groupGetInviteInfo(inviteUrl) as GroupInfoLike
            groupInfo = await buildInviteGroupCaption(conn, inviteInfo)
        } catch {
            m.reply('Grupo no encontrado')
            return
        }
    }
    if (groupInfo) {
        await conn.sendMessage(m.chat, {
            text: groupInfo, contextInfo: {
                externalAdReply: {
                    title: "🔰 Inspector de Grupos",
                    body: m.pushName,
                    thumbnailUrl: m.pp,
                    sourceUrl: args[0] ? args[0] : inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : info.md,
                    mediaType: 1,
                    showAdAttribution: false,
                    renderLargerThumbnail: true
                }
            }
        }, {quoted: m})
    } else {
        if (!channelUrl) return await conn.reply(m.chat, "*Verifique que sea un enlace de canal de WhatsApp.*", m)
        try {
            const newsletterInfo = await conn.newsletterMetadata("invite", channelUrl).catch(() => null) as NewsletterObject | null
            if (!newsletterInfo) return await conn.reply(m.chat, "*No se encontró información del canal.* Verifique que el enlace sea correcto.", m)
            const caption = buildNewsletterCaption(newsletterInfo)
            const pp = getNewsletterPreviewUrl(newsletterInfo, thumb)
            await conn.sendMessage(m.chat, {
                text: caption, contextInfo: {
                    externalAdReply: {
                        title: "📢 Inspector de Canales",
                        body: m.pushName,
                        thumbnailUrl: pp,
                        sourceUrl: args[0],
                        mediaType: 1,
                        showAdAttribution: false,
                        renderLargerThumbnail: true
                    }
                }
            }, {quoted: m})
            if (newsletterInfo.id) await conn.sendMessage(m.chat, {text: newsletterInfo.id})
        } catch (e: unknown) {
            logInfo(e)
        }
    }
    }
});
