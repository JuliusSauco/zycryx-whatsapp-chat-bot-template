import {definePlugin} from '../../core/define-plugin.js';
import {getCachedBuffer} from '../../lib/static-resource-cache.js';

export default definePlugin({
    help: ['donar'],
    tags: ['main'],
    command: /^dona(te|si)|donar|apoyar|paypal|donating|creditos$/i,
    register: true,
    async execute(m, {conn}) {
    let fkontak = {
        "key": {
            "participants": "0@s.whatsapp.net",
            "remoteJid": "status@broadcast",
            "fromMe": false,
            "id": "Halo"
        },
        "message": {"contactMessage": {"vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}},
        "participant": "0@s.whatsapp.net"
    }
    const pp = getCachedBuffer('./media/Menu2.jpg') || Buffer.alloc(0);
    let name = m.pushName
    let txt = `*\`[💖 ＤＯＮＡＣＩＯＮ 💖 ]\`*

✨ ¡Hola ${name}! ✨

¡𝘎𝘳𝘢𝘤𝘪𝘢𝘴 𝘱𝘰𝘳 𝘶𝘴𝘢𝘳 *${info.wm}*, 𝘵𝘶 𝘣𝘰𝘵 𝘨𝘳𝘢𝘵𝘶𝘪𝘵𝘰 𝘧𝘢𝘷𝘰𝘳𝘪𝘵𝘰! 🌟 𝘛𝘶 𝘢𝘱𝘰𝘺𝘰 𝘦𝘴 𝘧𝘶𝘯𝘥𝘢𝘮𝘦𝘯𝘵𝘢𝘭 𝘱𝘢𝘳𝘢 𝘮𝘢𝘯𝘵𝘦𝘯𝘦𝘳 𝘦𝘴𝘵𝘦 𝘱𝘳𝘰𝘺𝘦𝘤𝘵𝘰 𝘦𝘯 𝘮𝘢𝘳𝘤𝘩𝘢 𝘺 𝘴𝘪𝘦𝘮𝘱𝘳𝘦 𝘢𝘤𝘵𝘶𝘢𝘭𝘪𝘻𝘢𝘥𝘰. 𝘚𝘪 𝘲𝘶𝘪𝘦𝘳𝘦𝘴 𝘤𝘰𝘯𝘵𝘳𝘪𝘣𝘶𝘪𝘳 𝘺 𝘴𝘦𝘳 𝘱𝘢𝘳𝘵𝘦 𝘥𝘦 𝘦𝘴𝘵𝘢 𝘢𝘷𝘦𝘯𝘵𝘶𝘳𝘢, 𝘱𝘶𝘦𝘥𝘦𝘴 𝘩𝘢𝘤𝘦𝘳𝘭𝘰 𝘢 𝘵𝘳𝘢𝘷𝘦́𝘴 𝘥𝘦 𝘗𝘢𝘺𝘗𝘢𝘭 𝘰 𝘔𝘦𝘳𝘤𝘢𝘥𝘰 𝘗𝘢𝘨𝘰. 🙏

─────────────────────

*💸 𝘗𝘢𝘺𝘗𝘢𝘭:* 
https://paypal.me/OficialGD
*💸 𝘔𝘦𝘳𝘤𝘢𝘥𝘰 𝘗𝘢𝘨𝘰:*
*• 𝘈𝘭𝘪𝘢𝘴:* elrebelde21
*• 𝘊𝘝𝘜:* 0000003100059201491917

─────────────────────

🎁 *𝘖𝘵𝘳𝘢𝘴 𝘧𝘰𝘳𝘮𝘢𝘴 𝘥𝘦 𝘢𝘱𝘰𝘺𝘢𝘳:*
> 𝘚𝘪 𝘱𝘳𝘦𝘧𝘪𝘦𝘳𝘦𝘴 𝘢𝘺𝘶𝘥𝘢𝘳 𝘥𝘦 𝘰𝘵𝘳𝘢 𝘮𝘢𝘯𝘦𝘳𝘢, 𝘱𝘶𝘦𝘥𝘦𝘴 𝘥𝘰𝘯𝘢𝘳 𝘶𝘯 𝘯𝘶́𝘮𝘦𝘳𝘰 𝘱𝘢𝘳𝘢 𝘤𝘰𝘯𝘷𝘦𝘳𝘵𝘪𝘳𝘭𝘰 𝘦𝘯 𝘣𝘰𝘵, 𝘰 𝘤𝘰𝘯𝘵𝘢𝘤𝘵𝘢𝘳 𝘥𝘪𝘳𝘦𝘤𝘵𝘢𝘮𝘦𝘯𝘵𝘦 𝘤𝘰𝘯 𝘮𝘪 𝘤𝘳𝘦𝘢𝘥𝘰𝘳. ¡𝘛𝘢𝘮𝘣𝘪𝘦́𝘯 𝘱𝘶𝘦𝘥𝘦𝘴 𝘴𝘦𝘨𝘶𝘪𝘳𝘯𝘰𝘴 𝘺 𝘢𝘱𝘰𝘺𝘢𝘳𝘯𝘰𝘴 𝘦𝘯 𝘯𝘶𝘦𝘴𝘵𝘳𝘢𝘴 𝘳𝘦𝘥𝘦𝘴 𝘴𝘰𝘤𝘪𝘢𝘭𝘦𝘴! 👇

🔔 *𝘠𝘰𝘶𝘛𝘶𝘣𝘦 - 𝘚𝘶𝘴𝘤𝘳𝘪́𝘣𝘦𝘵𝘦*
${info.yt}

🌟 *𝘎𝘪𝘵𝘏𝘶𝘣 - 𝘋𝘢𝘭𝘦 𝘶𝘯𝘢 𝘦𝘴𝘵𝘳𝘦𝘭𝘭𝘢 ⭐*
${info.md}

🔗 *𝘌𝘯𝘭𝘢𝘤𝘦𝘴 𝘖𝘧𝘪𝘤𝘪𝘢𝘭𝘦𝘴 𝘦𝘯 𝘶𝘯 𝘜́𝘯𝘪𝘤𝘰 𝘓𝘶𝘨𝘢𝘳:*
https://atom.bio/lolibot

👍 *𝘍𝘢𝘤𝘦𝘣𝘰𝘰𝘬:*
${info.fb}

💕 *IG:*
${info.ig}

> ɢʀᴀᴄɪᴀs 💕`
    await conn.sendFile(m.chat, pp, 'error.jpg', txt, fkontak, undefined, {
        contextInfo: {
            forwardingScore: 9999999,
            isForwarded: true,
            mentionedJid: [m.sender],
            externalAdReply: {
                showAdAttribution: false,
                renderLargerThumbnail: false,
                title: 'ᴾᵘᵉᵈᵉ ᵃᵖᵒʸᵃʳ ⁿᵘᵉˢᵗʳᵒ ʳᵉᵖᵒˢᶦᵗᵒʳᶦᵒ ᶜᵒⁿ ᵘⁿᵃ ᵉˢᵗʳᵉˡˡᶦᵗᵃˢ ⭐',
                body: info.wm,
                mediaType: 2,
                thumbnailUrl: m.pp,
                mediaUrl: info.md,
                sourceUrl: info.md,
            }
        }
    });
    }
});
