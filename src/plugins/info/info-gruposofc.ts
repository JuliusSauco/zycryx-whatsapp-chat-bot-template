import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['grupos'],
    tags: ['main'],
    command: /^linkgc|grupos|gruposgatabot|gatabotgrupos|gruposdegatabot|groupofc|gruposgb|grupogb|groupgb$/i,
    register: true,
    async execute(_m, {sdk}) {
    const texto = sdk.content.renderMessage('info.groups.response', {
        group1: info.nn,
        group2: info.nn2,
        group3: info.nn3,
        group4: info.nn4,
        group5: info.nn5,
        supportGroup: info.nn6,
        channel1: info.nna,
    }).trim()
    await sdk.reply.text(texto)
//conn.fakeReply(m.chat, info, '0@s.whatsapp.net', '𝙏𝙝𝙚-𝙇𝙤𝙡𝙞𝘽𝙤𝙩-𝙈𝘿', 'status@broadcast')
    }
})
