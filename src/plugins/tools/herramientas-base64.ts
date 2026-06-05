import {definePlugin} from '../../core/define-plugin.js'
import {errorMessage, replyFailure, replyUsage} from '../../lib/reply-helpers.js'

export default definePlugin({
    help: ['tobase64'],
    tags: ['tools'],
    command: ['tobase64'],
    register: true,
    limit: 1,
    async execute(m, {text, usedPrefix, command}) {
    if (!text) return replyUsage(m, `${usedPrefix + command} texto`);

    try {
        const base64 = Buffer.from(text, 'utf-8').toString('base64');
        return m.reply(`${base64}`);
    } catch (e: unknown) {
        return replyFailure(m, `Error al convertir: ${errorMessage(e)}`);
    }
    }
})
