import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['instalarbot'],
    tags: ['main'],
    command: /^(instalarbot)/i,
    register: true,
    async execute(m, {sdk}) {
    const texto = sdk.content.renderMessage('info.installBot.response', {
        channel: info.nna,
        facebook: info.fb,
        repositoryUrl: info.md,
    });
    return sdk.sendMessage({
        text: texto,
        contextInfo: {
            externalAdReply: {
                title: info.wm,
                body: "Video tutorial",
                thumbnailUrl: m.pp,
                mediaUrl: 'https://youtu.be/z2kHwbu8e8s?si=2z3Fur9U4ccN7EwA',
                mediaType: 2
            },
            mentionedJid: [m.sender]
        }
    })
    }
})
