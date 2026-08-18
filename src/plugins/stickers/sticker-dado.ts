import {botInfo} from "../../core/config.js";
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {pickRandom} from '../../utils/random.js'

export default defineSdkPlugin({
    help: ['dados'],
    tags: ['game'],
    command: ['dado', 'dados', 'dadu'],
    register: true,
    async execute(m, {sdk}) {
    let dados = ['https://tinyurl.com/gdd01',
        'https://tinyurl.com/gdd02',
        'https://tinyurl.com/gdd003',
        'https://tinyurl.com/gdd004',
        'https://tinyurl.com/gdd05',
        'https://tinyurl.com/gdd006']
    let url = pickRandom(dados)
    await sdk.reply.react("🎲")
    await sdk.sendFile(url, 'sticker.webp', '', m, true, {
        contextInfo: {
            'forwardingScore': 200,
            'isForwarded': false,
            externalAdReply: {
                showAdAttribution: false,
                title: m.pushName,
                body: sdk.branding.watermark,
                mediaType: 2,
                sourceUrl: botInfo.md,
                thumbnail: m.pp
            }
        }
    })
    }
})
