import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {Jimp, JimpMime} from "jimp";
import {S_WHATSAPP_NET} from "@whiskeysockets/baileys";

export default defineSdkPlugin({
    help: ["setppgc"],
    tags: ["group"],
    command: /^setpp(group|grup|gc)?$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {sdk}) {
    try {
        let groupId = sdk.chatId;
        let quotedMsg = m.quoted ? m.quoted : m;
        if (!m.quoted) return sdk.reply.message('group.setPp.missingImage');
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

        sdk.conn.query({
            tag: "iq",
            attrs: {target: groupId, to: S_WHATSAPP_NET, type: "set", xmlns: "w:profile:picture"},
            content: [{tag: "picture", attrs: {type: "image"}, content: processedImage}],
        });

        await sdk.reply.react("✅️");
    } catch (error: unknown) {
        logInfo(error);
        return sdk.reply.react("❌");
    }
    }
});


;
