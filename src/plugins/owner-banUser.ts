import {definePlugin} from '../core/define-plugin.js';
import {getUserById, setUserBanStatus} from '../services/user.service.js';
import type {MessageContent} from '../types/context.js';

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

        if (!targetJid) return m.reply("🤓 Etiqueta al usuario boludito");
        const cleanJid = targetJid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        try {
            const user = await getUserById(cleanJid);
            if (!user) return m.reply("❌ Ese usuario no está registrado en la base de datos.");

            if (command === "banuser") {
                let ban = 'https://qu.ax/SJJt.mp3'
                let razon = text?.replace(/^(@\d{5,}|[+]?[\d\s\-()]+)\s*/g, "").trim() || null;
                await setUserBanStatus(cleanJid, true, razon);
                try {
                    const content: MessageContent = {
                        audio: {url: ban},
                        contextInfo: {
                            externalAdReply: {
                                title: `⚠️ ᴱˡ ᵘˢᵘᵃʳᶦᵒ(ᵃ) ᶠᵘᵉ ᵇᵃⁿᵉᵃᵈᵒ(ᵃ) 🙀 ⁿᵒ ᵖᵒᵈʳᵃ ᵘˢᵃʳ ᵃ`,
                                body: info.wm,
                                previewType: "PHOTO",
                                thumbnail: m.pp,
                                sourceUrl: info.md,
                                showAdAttribution: true
                            }
                        },
                        ptt: true,
                        mimetype: 'audio/mpeg',
                        fileName: `error.mp3`
                    };
                    await conn.sendMessage(m.chat, {
                        ...content
                    }, {quoted: m})
                } catch (e: unknown) {
                    m.reply(`🚫 El usuario @${cleanJid.split("@")[0]} ha sido *baneado* y no podrá usar el bot.${razon ? `\n\n📌 *Razón:* ${razon}` : ""}`, {mentions: [cleanJid]});
                }
            }

            if (command === "unbanuser") {
                await setUserBanStatus(cleanJid, false, null);
                return m.reply(`✅ El usuario @${cleanJid.split("@")[0]} ha sido *desbaneado* y puede volver a usar el bot.`, {mentions: [cleanJid]});
            }
        } catch (err: unknown) {
            console.error(err);
            return m.reply("❌ Ocurrió un error al ejecutar el comando.");
        }
    }
});
