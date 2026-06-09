import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['ss', 'ssweb'].map((v) => v + ' *<url>*'),
    tags: ['tools'],
    command: /^ss(web)?f?$/i,
    register: true,
    limit: 1,
    async execute(_m, {sdk}) {
    if (!sdk.args[0]) return sdk.reply.usage(sdk.content.renderMessage('tools.screenshot.usage', {command: sdk.usedPrefix + sdk.command}))
    await sdk.reply.react('⌛')
    try {
        let ss = await sdk.http.buffer(`https://api.dorratz.com/ssweb?url=${sdk.args[0]}`)
        await sdk.sendFile(ss, 'error.png', sdk.content.message('tools.screenshot.caption'))
        await sdk.reply.react('✅')
    } catch (e: unknown) {
        await sdk.reply.react('❌')
    }
    }
})
