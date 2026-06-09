import {logInfo} from '../../lib/logger.js';
// Código adaptado por https://github.com/GataNina-Li
// Código compatible con canales y comunidades de WhatsApp

import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {
    buildInviteGroupCaption,
    buildNewsletterCaption,
    getNewsletterPreviewUrl,
    type GroupInfoLike,
    type NewsletterObject,
} from './herramientas-superinspect.helpers.js';


export default defineSdkPlugin({
    help: ["superinspect", "inspect"],
    tags: ['tools'],
    command: /^(superinspect|inspect|revisar|inspeccionar)$/i,
    register: true,
    async execute(m, {sdk}) {
    const channelUrl = sdk.text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
    const thumb = m.pp

    let inviteCode: string | null = null
    if (!sdk.text) return await sdk.reply.message('tools.superInspect.missingLink')
    const inviteUrl = sdk.text.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]

    let groupInfo: string | null = null
    if (inviteUrl) {
        inviteCode = inviteUrl
        try {
            const inviteInfo = await sdk.conn.groupGetInviteInfo(inviteUrl) as GroupInfoLike
            groupInfo = await buildInviteGroupCaption(sdk.conn, inviteInfo)
        } catch {
            await sdk.reply.message('tools.superInspect.groupNotFound')
            return
        }
    }
    if (groupInfo) {
        await sdk.sendMessage({
            text: groupInfo, contextInfo: {
                externalAdReply: {
                    title: sdk.content.message('tools.superInspect.groupAdTitle'),
                    body: m.pushName,
                    thumbnailUrl: m.pp,
                    sourceUrl: sdk.args[0] ? sdk.args[0] : inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : info.md,
                    mediaType: 1,
                    showAdAttribution: false,
                    renderLargerThumbnail: true
                }
            }
        })
    } else {
        if (!channelUrl) return await sdk.reply.message('tools.superInspect.invalidChannel')
        try {
            const newsletterInfo = await sdk.conn.newsletterMetadata("invite", channelUrl).catch(() => null) as NewsletterObject | null
            if (!newsletterInfo) return await sdk.reply.message('tools.superInspect.channelNotFound')
            const caption = buildNewsletterCaption(newsletterInfo)
            const pp = getNewsletterPreviewUrl(newsletterInfo, thumb)
            await sdk.sendMessage({
                text: caption, contextInfo: {
                    externalAdReply: {
                        title: sdk.content.message('tools.superInspect.channelAdTitle'),
                        body: m.pushName,
                        thumbnailUrl: pp,
                        sourceUrl: sdk.args[0],
                        mediaType: 1,
                        showAdAttribution: false,
                        renderLargerThumbnail: true
                    }
                }
            })
            if (newsletterInfo.id) await sdk.sendMessage({text: newsletterInfo.id})
        } catch (e: unknown) {
            logInfo(e)
        }
    }
    }
});
