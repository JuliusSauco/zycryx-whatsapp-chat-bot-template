import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getUserById, setUserBanStatus} from '../../services/user.service.js';
import type {MessageContent} from '../../types/context.js';

export default defineSdkPlugin({
    help: ['banuser @tag|número', 'unbanuser @tag|número'],
    tags: ['owner'],
    command: /^banuser|unbanuser$/i,
    owner: true,
    async execute(m, {conn, text, command, branding, sdk}) {
        let targetJid = null;

        if (m.isGroup && m.mentionedJid?.[0]) {
            targetJid = m.mentionedJid[0];
        }

        if (!targetJid && text?.match(/\d{5,}/)) {
            const number = text.match(/\d{5,}/)?.[0];
            targetJid = number + "@s.whatsapp.net";
        }

        if (!targetJid) return sdk.reply.message('owner.banUser.missingTarget');
        const cleanJid = targetJid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        try {
            const user = await getUserById(cleanJid);
            if (!user) return sdk.reply.message('owner.banUser.unknownUser');

            if (command === "banuser") {
                let ban = sdk.content.message('owner.banUser.audio')
                let razon = text?.replace(/^(@\d{5,}|[+]?[\d\s\-()]+)\s*/g, "").trim() || null;
                await setUserBanStatus(cleanJid, true, razon);
                try {
                    const content: MessageContent = {
                        audio: {url: ban},
                        contextInfo: {
                            externalAdReply: {
                                title: sdk.content.message('owner.banUser.adTitle'),
                                body: branding.watermark,
                                previewType: "PHOTO",
                                thumbnail: m.pp,
                                sourceUrl: info.md,
                                showAdAttribution: true
                            }
                        },
                        ptt: true,
                        mimetype: 'audio/mpeg',
                        fileName: sdk.content.message('owner.banUser.audioFileName')
                    };
                    await conn.sendMessage(m.chat, {
                        ...content
                    }, {quoted: m})
                } catch (e: unknown) {
                    const reasonText = razon ? sdk.content.renderMessage('owner.banUser.reason', {reason: razon}) : "";
                    await sdk.reply.message('owner.banUser.banFallback', {
                        user: cleanJid.split("@")[0],
                        reason: reasonText,
                    }, null, {mentions: [cleanJid]});
                }
            }

            if (command === "unbanuser") {
                await setUserBanStatus(cleanJid, false, null);
                return sdk.reply.message('owner.banUser.unbanned', {
                    user: cleanJid.split("@")[0],
                }, null, {mentions: [cleanJid]});
            }
        } catch (err: unknown) {
            logError(err);
            return sdk.reply.message('owner.banUser.error');
        }
    }
});
