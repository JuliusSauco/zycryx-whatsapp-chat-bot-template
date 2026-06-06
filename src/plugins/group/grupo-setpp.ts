import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {Jimp, JimpMime} from "jimp";
import {S_WHATSAPP_NET} from "@whiskeysockets/baileys";

export default definePlugin({
    help: ["setppgc"],
    tags: ["group"],
    command: /^setpp(group|grup|gc)?$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {conn}) {
    try {
        let groupId = m.chat;
        let quotedMsg = m.quoted ? m.quoted : m;
        if (!m.quoted) return m.reply(`*⚠️ Responde a una Imagen.*`);
        let media = await quotedMsg.download();

        async function processImage(media: Buffer) {
            const image = await Jimp.read(media);
            const resizedImage = image.width > image.height
                ? image.resize({w: 720})
                : image.resize({h: 720});
            return {
                img: await resizedImage.getBuffer(JimpMime.jpeg),
            };
        }

        var {img: processedImage} = await processImage(media);

        conn.query({
            tag: "iq",
            attrs: {target: groupId, to: S_WHATSAPP_NET, type: "set", xmlns: "w:profile:picture"},
            content: [{tag: "picture", attrs: {type: "image"}, content: processedImage}],
        });

        m.react("✅️");
    } catch (error: unknown) {
        logInfo(error);
        return m.react("❌");
    }
    }
});


;
