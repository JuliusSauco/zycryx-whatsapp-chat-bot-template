import {definePlugin} from '../core/define-plugin.js'
import * as Jimp from "jimp";
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

        async function processImage(media: any) {
            // @ts-ignore
            const image = await Jimp.read(media);
            const resizedImage = image.getWidth() > image.getHeight()
                // @ts-ignore
                ? image.resize(720, Jimp.AUTO)
                // @ts-ignore
                : image.resize(Jimp.AUTO, 720);
            return {
                // @ts-ignore
                img: await resizedImage.getBufferAsync(Jimp.MIME_JPEG),
            };
        }

        var {img: processedImage} = await processImage(media);

        conn.query({
            tag: "iq",
            attrs: {target: groupId, to: S_WHATSAPP_NET, type: "set", xmlns: "w:profile:picture"},
            content: [{tag: "picture", attrs: {type: "image"}, content: processedImage}],
        });

        m.react("✅️");
    } catch (error: any) {
        console.log(error);
        return m.react("❌");
    }
    }
});


;
