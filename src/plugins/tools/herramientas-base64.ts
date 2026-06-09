import {defineSdkPlugin, errorMessage} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['tobase64'],
    tags: ['tools'],
    command: ['tobase64'],
    register: true,
    limit: 1,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.usage(sdk.content.renderMessage('tools.base64.usage', {command: sdk.usedPrefix + sdk.command}));

    try {
        const base64 = Buffer.from(sdk.text, 'utf-8').toString('base64');
        return m.reply(`${base64}`);
    } catch (e: unknown) {
        return sdk.reply.failure(sdk.content.renderMessage('tools.base64.failure', {error: errorMessage(e)}));
    }
    }
})
