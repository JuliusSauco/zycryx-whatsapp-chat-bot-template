import {botInfo} from "../../core/config.js";
import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['grupos'],
    tags: ['main'],
    command: /^linkgc|grupos|gruposgatabot|gatabotgrupos|gruposdegatabot|groupofc|gruposgb|grupogb|groupgb$/i,
    register: true,
    async execute(_m, {sdk}) {
    const texto = sdk.content.renderMessage('info.groups.response', {
        group1: botInfo.nn,
        group2: botInfo.nn2,
        group3: botInfo.nn3,
        group4: botInfo.nn4,
        group5: botInfo.nn5,
        supportGroup: botInfo.nn6,
        channel1: botInfo.nna,
    }).trim()
    await sdk.reply.text(texto)
//conn.fakeReply(m.chat, info, '0@s.whatsapp.net', '𝙏𝙝𝙚-𝙇𝙤𝙡𝙞𝘽𝙤𝙩-𝙈𝘿', 'status@broadcast')
    }
})
