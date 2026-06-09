import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {getUserById, setUserBanStatus} from '../../services/user.service.js';
import type {MessageContent} from '../../types/context.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['banuser @tag|número', 'unbanuser @tag|número'],
    tags: ['owner'],
    command: /^banuser|unbanuser$/i,
    owner: true,
    async execute(m, {conn, text, command}) {
        let targetJid = null;

        if (m.isGroup && m.mentionedJid?.[0]) {
            targetJid = m.mentionedJid[0];
        }

        if (!targetJid && text?.match(/\d{5,}/)) {
            const number = text.match(/\d{5,}/)?.[0];
            targetJid = number + "@s.whatsapp.net";
        }

        if (!targetJid) return m.reply(getRequiredPluginMessage('owner.banUser.missingTarget'));
        const cleanJid = targetJid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        try {
            const user = await getUserById(cleanJid);
            if (!user) return m.reply(getRequiredPluginMessage('owner.banUser.unknownUser'));

            if (command === "banuser") {
                let ban = getRequiredPluginMessage('owner.banUser.audio')
                let razon = text?.replace(/^(@\d{5,}|[+]?[\d\s\-()]+)\s*/g, "").trim() || null;
                await setUserBanStatus(cleanJid, true, razon);
                try {
                    const content: MessageContent = {
                        audio: {url: ban},
                        contextInfo: {
                            externalAdReply: {
                                title: getRequiredPluginMessage('owner.banUser.adTitle'),
                                body: info.wm,
                                previewType: "PHOTO",
                                thumbnail: m.pp,
                                sourceUrl: info.md,
                                showAdAttribution: true
                            }
                        },
                        ptt: true,
                        mimetype: 'audio/mpeg',
                        fileName: getRequiredPluginMessage('owner.banUser.audioFileName')
                    };
                    await conn.sendMessage(m.chat, {
                        ...content
                    }, {quoted: m})
                } catch (e: unknown) {
                    const reasonText = razon ? renderTemplate(getRequiredPluginMessage('owner.banUser.reason'), {reason: razon}) : "";
                    m.reply(renderTemplate(getRequiredPluginMessage('owner.banUser.banFallback'), {
                        user: cleanJid.split("@")[0],
                        reason: reasonText,
                    }), {mentions: [cleanJid]});
                }
            }

            if (command === "unbanuser") {
                await setUserBanStatus(cleanJid, false, null);
                return m.reply(renderTemplate(getRequiredPluginMessage('owner.banUser.unbanned'), {
                    user: cleanJid.split("@")[0],
                }), {mentions: [cleanJid]});
            }
        } catch (err: unknown) {
            logError(err);
            return m.reply(getRequiredPluginMessage('owner.banUser.error'));
        }
    }
});
