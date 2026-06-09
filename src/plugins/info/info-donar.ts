import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getCachedBuffer} from '../../lib/static-resource-cache.js';

export default defineSdkPlugin({
    help: ['donar'],
    tags: ['main'],
    command: /^dona(te|si)|donar|apoyar|paypal|donating|creditos$/i,
    register: true,
    async execute(m, {sdk}) {
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
    const pp = getCachedBuffer('./resources/media/menus/Menu2.jpg') || Buffer.alloc(0);
    const txt = sdk.content.renderMessage('info.donate.response', {
        name: m.pushName || sdk.sender.split('@')[0],
        watermark: info.wm,
        youtube: info.yt,
        repositoryUrl: info.md,
        facebook: info.fb,
        instagram: info.ig,
    });
    await sdk.conn.sendFile(sdk.chatId, pp, 'error.jpg', txt, fkontak, undefined, {
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
